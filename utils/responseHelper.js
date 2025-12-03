const success = (res, data = null, statusCode = 200) => {
    const response = {
        success: true,
    };

    if (data !== null) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
};

const created = (res, data = null, message = 'Resource created successfully') => {
    const response = {
        success: true,
        message
    };

    if (data !== null) {
        response.data = data;
    }

    return res.status(201).json(response);
};

const error = (res, message = 'Internal server error', statusCode = 500) => {
    return res.status(statusCode).json({
        success: false,
        message
    });
};

const notFound = (res, message = 'Resource not found') => {
    return res.status(404).json({
        success: false,
        message
    });
};

const unauthorized = (res, message = 'Unauthorized') => {
    return res.status(401).json({
        success: false,
        message
    });
};

const forbidden = (res, message = 'Forbidden') => {
    return res.status(403).json({
        success: false,
        message
    });
};

const validationError = (res, errors, message = 'Validation failed') => {
    return res.status(400).json({
        success: false,
        message,
        errors
    });
};

module.exports = {
    success,
    created,
    error,
    notFound,
    unauthorized,
    forbidden,
    validationError
};
