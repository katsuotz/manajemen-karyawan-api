const { validationResult } = require('express-validator');
const { User } = require('../models');
const { generateToken } = require('../utils/jwt');
const { success, error, unauthorized, validationError } = require('../utils/responseHelper');

const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return validationError(res, errors.array());
        }

        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return unauthorized(res, 'Invalid email or password');
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return unauthorized(res, 'Invalid email or password');
        }

        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        return success(res, {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        }, 200, 'Login successful');
    } catch (err) {
        console.error('Login error:', err);
        return error(res);
    }
};

module.exports = {
    login
};
