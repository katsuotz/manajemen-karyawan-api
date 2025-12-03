'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(
            'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
        );

        await queryInterface.createTable('employees', {
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
            age: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            position: {
                type: Sequelize.STRING,
                allowNull: false
            },
            salary: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                validate: {
                    min: 0
                }
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

        // Add indexes
        await queryInterface.addIndex('employees', ['position'], {
            name: 'employees_position_idx'
        });
    },

    async down(queryInterface, Sequelize) {
        // Remove indexes first
        await queryInterface.removeIndex('employees', 'employees_position_idx');

        // Drop the table
        await queryInterface.dropTable('employees');
    }
};
