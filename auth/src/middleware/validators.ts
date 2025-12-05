import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';

export class ValidationError extends Error {
    constructor(public field: string, public message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

interface ValidationResult {
    isValid: boolean;
    errors: { field: string; message: string }[];
    sanitized?: any;
}

// NEED THIS EXPLAINED
export const sanitize = {
    trim: (value: any): any => {
        if (typeof value === 'string') {
            return value.trim();
        }
        return value;
    },
    escape: (value: any): any => {
        if (typeof value === 'string') {
            const map: { [key: string]: string} = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '/': '&#x2F;',
            };
            return value.replace(/[&<>"'\/]/g, (c) => map[c] || c);
        }
        return value;
    },
    normalizeEmail: (email: any): any => {
        if (typeof email === 'string') {
            return email.toLowerCase().trim();
        }
        return email;
    },
}

export const validators = {
    required: (value: any, fieldName: string): string | null => {
        if (value === undefined || value === null || value === '') {
            return `${fieldName} is required.`;
        }
        return null;
    },

    string: (value: any, fieldName: string): string | null => {
        if (typeof value !== 'string') {
            return `${fieldName} must be a string.`;
        }
        return null;
    },

    // NEED THIS EXPLAINED
    length: (min: number, max:number) => (value: string, fieldName: string): string | null => {
        if (value.length < min) {
            return `${fieldName} must be at least ${min} characters long.`;
        }
        if (value.length > max) {
            return `${fieldName} must be less than ${max} characters long.`;
        }
        return null;
    },

    email: (value: string, fieldName: string): string | null => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return `${fieldName} must be a valid email address.`;
        }
        return null;
    },

    username: (value: string, fieldName: string): string | null => {
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!usernameRegex.test(value)) {
            return `${fieldName} can only contain letters, numbers, underscores, and hyphens`;
        }
        return null;
    },

    password: (value: string, fieldName: string): string | null => {
        if (value.length < 8) {
            return `${fieldName} must be at least 8 characters long.`;
        }
        if (value.length > 17) {
            return `${fieldName} must be less than 17 characters long.`;
        }
        if (!/(?=.*[a-z])/.test(value)) {
            return `${fieldName} must contain at least one lowercase letter`;
        }
        if (!/(?=.*[A-Z])/.test(value)) {
            return `${fieldName} must contain at least one uppercase letter`;
        }
        if (!/(?=.*\d)/.test(value)) {
            return `${fieldName} must contain at least one number`;
        }
        if (!/(?=.*[@$!%*?&])/.test(value)) {
            return `${fieldName} must contain at least one special character`;
        }
        return null;
    },

    objectId: (value: any, fieldName: string): string | null => {
        if (!ObjectId.isValid(value)) {
            return `${fieldName} must be a valid ObjectId.`;
        }
        return null;
    },

    array: (value: any, fieldName: string): string | null => {
        if (!Array.isArray(value)) {
            return `${fieldName} must be an array.`;
        }
        return null;
    },

    notEmpty: (value: any, fieldName: string): string | null => {
        if (Array.isArray(value) && value.length === 0) {
            return `${fieldName} cannot be empty.`;
        }
        return null;
    },

    roles: (value: any, fieldName: string): string | null => {
        if (!Array.isArray(value) || value.length === 0) {
            return `${fieldName} must be an array.`;
        }

        for (const role of value) {
            if (typeof role !== 'number') {
                return `${fieldName} must contain only numbers.`;
            }
        }
        return null;
    }
};

interface FieldRule {
    field: string;
    validators: ((value: any, fieldName: string) => string | null)[];
    sanitizers?: ((value: any) => any)[];
}

export const validate = (rules: FieldRule[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const errors: { field: string; message: string }[] = [];
        const sanitized: any = { ...req.body };

        for (const rule of rules) {
            const value = req.body[rule.field];
            const fieldName = rule.field;

            const requiredValidator = rule.validators.find(v => v === validators.required);
            if (requiredValidator) {
                const requiredError = requiredValidator(value, fieldName);
                if (requiredError) {
                    errors.push({ field: fieldName, message: requiredError });
                    continue;
                }
            }

            let sanitizedValue = value;
            if (rule.sanitizers && value !== undefined && value !== null && value !== '') {
                for (const sanitizer of rule.sanitizers) {
                    sanitizedValue = sanitizer(sanitizedValue);
                }
                sanitized[rule.field] = sanitizedValue;
            }

            for (const validator of rule.validators) {
                if (validator === validators.required) continue;
                
                const error = validator(sanitizedValue, fieldName);
                if (error) {
                    errors.push({ field: fieldName, message: error });
                    break;
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                errors,
            });
        }

        req.body = sanitized;
        next();
    }
}

const validationFields = {
    username: {
        field: 'username',
        validators: [
            validators.required,
            validators.string,
            validators.length(3, 16),
            validators.username,
        ],
        sanitizers: [
            sanitize.trim,
            sanitize.escape,
        ]
    },
    email: {
        field: 'email',
        validators: [
            validators.required,
            validators.string,
            validators.email,
            validators.length(6, 255),
        ],
        sanitizers: [
            sanitize.trim,
            sanitize.normalizeEmail,
        ]
    },
    password: {
        field: 'password',
        validators: [
            validators.required,
            validators.string,
            validators.password,
        ],
        sanitizers: [
            sanitize.trim
        ]
    },
    newPassword: {
        field: 'newPassword',
        validators: [
            validators.required,
            validators.string,
            validators.password,
        ],
        sanitizers: [
            sanitize.trim
        ]
    },
    userId: {
        field: 'userId',
        validators: [
            validators.required,
            validators.objectId,
        ]
    },
    roles: {
        field: 'roles',
        validators: [
            validators.required,
            validators.array,
            validators.roles,
        ],
    }
}

export const validationRules = {
    register: [
        validationFields.username,
        validationFields.email,
        validationFields.password,
    ],

    login: [
        validationFields.username,
        validationFields.password,
    ],

    resetPassword: [
        validationFields.password,
        validationFields.newPassword,
    ],

    deleteSelf: [
        validationFields.password,
    ],

    deleteUser: [
        validationFields.userId,
    ],

    updateUserRoles: [
        validationFields.userId,
        validationFields.roles,
    ],

    unlockUser: [
        validationFields.userId,
    ],
}
