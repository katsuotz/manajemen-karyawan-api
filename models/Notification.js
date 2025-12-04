module.exports = (sequelize, DataTypes) => {
    const Notification = sequelize.define('Notification', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 255]
            }
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        type: {
            type: DataTypes.ENUM('employee_created', 'employee_failed', 'employee_updated', 'employee_deleted', 'system'),
            allowNull: false,
            defaultValue: 'system'
        },
        read: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        jobId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Reference to background job ID'
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Additional notification data'
        }
    }, {
        tableName: 'notifications',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                fields: ['read']
            },
            {
                fields: ['type']
            },
            {
                fields: ['created_at']
            }
        ]
    });

    return Notification;
};
