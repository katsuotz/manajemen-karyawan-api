'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(
            'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
        );

        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('uuid_generate_v4()'),
                primaryKey: true,
                allowNull: false
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            password: {
                type: Sequelize.STRING,
                allowNull: false
            },
            role: {
                type: Sequelize.ENUM('admin', 'user'),
                defaultValue: 'user',
                allowNull: false
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Add index on email for faster lookups
        await queryInterface.addIndex('users', ['email'], {
            name: 'users_email_idx',
            unique: true
        });
    },

    async down(queryInterface, Sequelize) {
        // Remove the index first
        await queryInterface.removeIndex('users', 'users_email_idx');

        // Drop the table
        await queryInterface.dropTable('users');

        // Drop the ENUM type (PostgreSQL specific)
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
    }
};
