const fs = require('fs');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const { success, created, error, validationError } = require('../utils/responseHelper');
const { addBatchesToQueue, getImportProgress } = require('../services/importQueue');

const BATCH_SIZE = 50;

const importController = {
    uploadAndImportCSV: async (req, res) => {
        try {
            if (!req.file) {
                return error(res, 'No file uploaded', 400);
            }

            const jobId = uuidv4();
            const filePath = req.file.path;
            let batches = [];
            let currentBatch = [];
            let totalRows = 0;

            // Create readable stream and process CSV
            return new Promise((resolve, reject) => {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (row) => {
                        totalRows++;
                        currentBatch.push(row);

                        // Create batch when reaching batch size
                        if (currentBatch.length >= BATCH_SIZE) {
                            batches.push([...currentBatch]);
                            currentBatch = [];
                        }
                    })
                    .on('end', async () => {
                        try {
                            // Add remaining rows as last batch
                            if (currentBatch.length > 0) {
                                batches.push(currentBatch);
                            }

                            if (batches.length === 0) {
                                // Clean up file if no valid data
                                fs.unlinkSync(filePath);
                                return validationError(res, [], 'CSV file is empty or contains no valid data');
                            }

                            // Add batches to queue for background processing
                            await addBatchesToQueue(batches, jobId);
                            
                            // Clean up uploaded file
                            fs.unlinkSync(filePath);

                            return created(res, {
                                jobId,
                                totalRows,
                                totalBatches: batches.length,
                                batchSize: BATCH_SIZE
                            }, 'CSV import started successfully');
                        } catch (err) {
                            console.error('Import initialization error:', err);
                            // Clean up file on error
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                            return error(res, 'Failed to initialize import process');
                        }
                    })
                    .on('error', (err) => {
                        console.error('CSV parsing error:', err);
                        // Clean up file on error
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                        return error(res, 'Failed to parse CSV file');
                    });
            });
        } catch (err) {
            console.error('Upload error:', err);
            // Clean up file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return error(res);
        }
    },

    getImportStatus: async (req, res) => {
        try {
            const { jobId } = req.params;
            
            if (!jobId) {
                return error(res, 'Job ID is required', 400);
            }

            const progress = await getImportProgress(jobId);
            
            if (!progress) {
                return error(res, 'Import job not found', 404);
            }

            return success(res, progress);
        } catch (err) {
            console.error('Get import status error:', err);
            return error(res);
        }
    }
};

module.exports = importController;
