const Queue = require('bull');
const { Employee } = require('../models');
const { v4: uuidv4 } = require('uuid');
const notificationController = require('../controllers/notificationController');

// Create employee creation queue using Bull
const employeeQueue = new Queue('employee creation', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
    }
});

// Process single employee creation
const processEmployeeCreation = async (jobData) => {
    try {
        const { employeeData, jobId, userId } = jobData;
        
        // Validate required fields
        if (!employeeData) {
            throw new Error('Employee data is required');
        }
        
        // Check for null/undefined required fields
        const requiredFields = ['name', 'age', 'position', 'salary'];
        const missingFields = requiredFields.filter(field => 
            employeeData[field] === undefined || employeeData[field] === null
        );
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Validate field types and values
        if (typeof employeeData.name !== 'string' || employeeData.name.trim().length === 0) {
            throw new Error('Name is required');
        }
        
        const age = parseInt(employeeData.age);
        if (isNaN(age)) {
            throw new Error('Age must be a number');
        }
        
        if (typeof employeeData.position !== 'string' || employeeData.position.trim().length === 0) {
            throw new Error('Position is required');
        }
        
        const salary = parseFloat(employeeData.salary);
        if (isNaN(salary) || salary <= 0) {
            throw new Error('Salary must be a positive number');
        }
        
        const employee = await Employee.create({
            id: uuidv4(),
            name: employeeData.name,
            age: parseInt(employeeData.age),
            position: employeeData.position,
            salary: parseFloat(employeeData.salary)
        }, { validate: true });

        // Publish success notification to Redis
        try {
            await employeeQueue.client.publish('employee-notifications', JSON.stringify({
                type: 'employee_created',
                userId,
                jobId,
                status: 'success',
                data: {
                    employee: {
                        id: employee.id,
                        name: employee.name,
                        age: employee.age,
                        position: employee.position,
                        salary: employee.salary,
                        created_at: employee.created_at
                    }
                },
                timestamp: new Date().toISOString()
            }));
        } catch (publishError) {
            console.error('Failed to publish success notification:', publishError);
            // Don't fail the job if notification fails
        }

        // Create database notification
        try {
            await notificationController.createNotification({
                title: 'Employee Created Successfully',
                message: `Employee "${employee.name}" has been created successfully.`,
                type: 'employee_created',
                jobId,
                metadata: {
                    employeeId: employee.id,
                    employeeName: employee.name,
                    position: employee.position
                }
            });
        } catch (notificationError) {
            console.error('Failed to create database notification:', notificationError);
            // Don't fail the job if notification fails
        }

        return { success: true, employee };
    } catch (error) {
        console.error('Employee creation error:', error);
        
        // Publish error notification to Redis
        try {
            await employeeQueue.client.publish('employee-notifications', JSON.stringify({
                type: 'employee_created',
                userId: jobData.userId,
                jobId: jobData.jobId,
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            }));
        } catch (publishError) {
            console.error('Failed to publish error notification:', publishError);
            // Don't fail the job if notification fails
        }

        // Create database notification for error
        try {
            await notificationController.createNotification({
                title: 'Employee Creation Failed',
                message: `Failed to create employee: ${error.message}`,
                type: 'employee_failed',
                jobId: jobData.jobId,
                metadata: {
                    error: error.message,
                    employeeData: jobData.employeeData
                }
            });
        } catch (notificationError) {
            console.error('Failed to create database notification:', notificationError);
            // Don't fail the job if notification fails
        }
        
        throw error;
    }
};

// Queue processor for employee creation
employeeQueue.process('create-employee', async (job) => {
    const result = await processEmployeeCreation(job.data);
    return result;
});

// Add employee creation job to queue
const addEmployeeCreationJob = async (employeeData, userId) => {
    const jobId = uuidv4();
    
    await employeeQueue.add('create-employee', {
        employeeData,
        jobId,
        userId
    }, {
        attempts: 3,
        backoff: 'exponential',
        removeOnComplete: 10,
        removeOnFail: 5
    });
    
    return jobId;
};

module.exports = {
    employeeQueue,
    addEmployeeCreationJob,
    processEmployeeCreation
};
