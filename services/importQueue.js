const Queue = require('bull');
const { Employee } = require('../models');
const { v4: uuidv4 } = require('uuid');

// Create import queue using Bull
const importQueue = new Queue('employee import', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
    }
});

// Process batch of employees
const processBatch = async (batch, jobId) => {
    try {
        const employees = batch.map(row => ({
            id: uuidv4(),
            name: row.name?.trim(),
            age: parseInt(row.age),
            position: row.position?.trim(),
            salary: parseFloat(row.salary)
        })).filter(emp => emp.name && emp.position && !isNaN(emp.age) && !isNaN(emp.salary));

        if (employees.length > 0) {
            await Employee.bulkCreate(employees, { validate: true });
        }

        return { processed: employees.length, total: batch.length };
    } catch (error) {
        console.error(`Batch processing error for job ${jobId}:`, error);
        throw error;
    }
};

// Queue processor
importQueue.process('process-csv-batch', async (job) => {
    const { batch, jobId, totalBatches, currentBatch } = job.data;
    
    try {
        const result = await processBatch(batch, jobId);
        
        // Update progress in Redis
        const progress = Math.round(((currentBatch + 1) / totalBatches) * 100);
        await importQueue.client.hset(`import-progress:${jobId}`, {
            progress,
            processed: (currentBatch + 1),
            totalBatches,
            status: progress === 100 ? 'completed' : 'processing',
            lastUpdated: new Date().toISOString()
        });
        
        return result;
    } catch (error) {
        // Update error status
        await importQueue.client.hset(`import-progress:${jobId}`, {
            status: 'error',
            error: error.message,
            lastUpdated: new Date().toISOString()
        });
        throw error;
    }
});

// Initialize import progress tracking
const initializeImport = async (jobId, totalBatches) => {
    await importQueue.client.hset(`import-progress:${jobId}`, {
        progress: 0,
        processed: 0,
        totalBatches,
        status: 'processing',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    });
    
    // Set expiration for progress key ( 24 hours )
    await importQueue.client.expire(`import-progress:${jobId}`, 86400);
};

// Add batches to queue
const addBatchesToQueue = async (batches, jobId) => {
    await initializeImport(jobId, batches.length);
    
    const promises = batches.map((batch, index) => {
        return importQueue.add('process-csv-batch', {
            batch,
            jobId,
            totalBatches: batches.length,
            currentBatch: index
        }, {
            attempts: 3,
            backoff: 'exponential'
        });
    });
    
    await Promise.all(promises);
    return jobId;
};

// Get import progress
const getImportProgress = async (jobId) => {
    const progress = await importQueue.client.hgetall(`import-progress:${jobId}`);
    
    if (!progress || Object.keys(progress).length === 0) {
        return null;
    }
    
    // Convert string values to appropriate types
    return {
        progress: parseInt(progress.progress) || 0,
        processed: parseInt(progress.processed) || 0,
        totalBatches: parseInt(progress.totalBatches) || 0,
        status: progress.status,
        error: progress.error || null,
        createdAt: progress.createdAt,
        lastUpdated: progress.lastUpdated
    };
};

module.exports = {
    importQueue,
    addBatchesToQueue,
    getImportProgress
};
