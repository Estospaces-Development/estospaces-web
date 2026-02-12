import { z } from 'zod';

// ─── Auth Schemas ───────────────────────────────────────────────────────────

export const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    phone: z
        .string()
        .regex(/^\+?[\d\s-]{10,15}$/, 'Please enter a valid phone number'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
    role: z.enum(['user', 'broker', 'manager'] as const),
    agreesToTerms: z.literal(true),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

// ─── Property Schemas ───────────────────────────────────────────────────────

export const propertySchema = z.object({
    title: z
        .string()
        .min(5, 'Title must be at least 5 characters')
        .max(120, 'Title must be less than 120 characters'),
    description: z
        .string()
        .min(20, 'Description must be at least 20 characters')
        .max(5000, 'Description must be less than 5000 characters'),
    propertyType: z.enum(['apartment', 'house', 'villa', 'commercial', 'land', 'studio'] as const),
    listingType: z.enum(['sale', 'rent'] as const),
    price: z.number().positive('Price must be greater than 0'),
    currency: z.string().default('GBP'),
    bedrooms: z.number().int().min(0).max(20),
    bathrooms: z.number().int().min(0).max(20),
    area: z.number().positive('Area must be greater than 0'),
    areaUnit: z.enum(['sqft', 'sqm'] as const).default('sqft'),
    address: z.object({
        line1: z.string().min(3, 'Address line 1 is required'),
        line2: z.string().optional(),
        city: z.string().min(2, 'City is required'),
        county: z.string().optional(),
        postcode: z
            .string()
            .regex(/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, 'Please enter a valid UK postcode'),
        country: z.string().default('United Kingdom'),
    }),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    features: z.array(z.string()).default([]),
    furnished: z.enum(['furnished', 'unfurnished', 'part-furnished'] as const).optional(),
    availableFrom: z.string().optional(),
    images: z.array(z.string().url()).max(20, 'Maximum 20 images allowed').default([]),
});

// ─── Lead Schemas ───────────────────────────────────────────────────────────

export const leadSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    phone: z
        .string()
        .regex(/^\+?[\d\s-]{10,15}$/, 'Please enter a valid phone number'),
    source: z.enum(['website', 'referral', 'direct', 'social', 'portal'] as const),
    status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'] as const).default('new'),
    budget: z.number().positive().optional(),
    propertyType: z.string().optional(),
    notes: z.string().max(2000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent'] as const).default('medium'),
});

// ─── Booking Schemas ────────────────────────────────────────────────────────

export const bookingSchema = z.object({
    propertyId: z.string().min(1, 'Property is required'),
    date: z.string().min(1, 'Date is required'),
    time: z.string().min(1, 'Time is required'),
    type: z.enum(['viewing', 'inspection', 'meeting'] as const),
    notes: z.string().max(500).optional(),
    contactPhone: z
        .string()
        .regex(/^\+?[\d\s-]{10,15}$/, 'Please enter a valid phone number')
        .optional(),
});

// ─── Profile Schemas ────────────────────────────────────────────────────────

export const profileUpdateSchema = z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    phone: z.string().regex(/^\+?[\d\s-]{10,15}$/).optional(),
    bio: z.string().max(500).optional(),
    avatarUrl: z.string().url().optional(),
});

// ─── Community Post Schema ──────────────────────────────────────────────────

export const communityPostSchema = z.object({
    content: z
        .string()
        .min(10, 'Post must be at least 10 characters')
        .max(2000, 'Post must be less than 2000 characters'),
    tag: z.enum(['general', 'deal', 'question', 'announcement', 'market-update'] as const),
    visibility: z.enum(['all', 'managers', 'brokers'] as const).default('all'),
});

// ─── Type Exports ───────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PropertyInput = z.infer<typeof propertySchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type CommunityPostInput = z.infer<typeof communityPostSchema>;
