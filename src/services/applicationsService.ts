/**
 * Applications Service
 * Returns mock data for applications (no backend API calls)
 */

export interface Application {
    id: string;
    name: string;
    email: string;
    propertyInterested: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    score: number;
    budget: string;
    submittedDate: string;
    lastContact: string;
    phone: string;
    createdAt: string;
    updatedAt: string;
}

export interface ApplicationsResponse {
    data: Application[] | null;
    error: string | null;
}

export interface ApplicationResponse {
    data: Application | null;
    error: string | null;
}

/**
 * Fetch applications for the logged-in manager's properties
 */
export const getApplications = async (): Promise<ApplicationsResponse> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const mockApplications: Application[] = [
        {
            id: 'app-1',
            name: 'John Smith',
            email: 'john.smith@example.com',
            propertyInterested: 'Sunset Villa',
            status: 'Pending',
            score: 88,
            budget: '$2,400/mo',
            submittedDate: new Date().toISOString(),
            lastContact: 'Today',
            phone: '+1 (555) 111-2222',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            id: 'app-2',
            name: 'Emily Brown',
            email: 'emily.b@example.com',
            propertyInterested: 'Downtown Loft',
            status: 'Approved',
            score: 95,
            budget: '$3,500/mo',
            submittedDate: new Date(Date.now() - 172800000).toISOString(),
            lastContact: '2 days ago',
            phone: '+1 (555) 333-4444',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            updatedAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
            id: 'app-3',
            name: 'Michael Wilson',
            email: 'm.wilson@example.com',
            propertyInterested: 'Green Heights',
            status: 'Rejected',
            score: 60,
            budget: '$1,600/mo',
            submittedDate: new Date(Date.now() - 432000000).toISOString(),
            lastContact: '5 days ago',
            phone: '+1 (555) 555-6666',
            createdAt: new Date(Date.now() - 432000000).toISOString(),
            updatedAt: new Date(Date.now() - 432000000).toISOString(),
        },
        {
            id: 'app-4',
            name: 'Sarah Davis',
            email: 'sdavis@example.com',
            propertyInterested: 'Luxury Penthouse',
            status: 'Pending',
            score: 91,
            budget: '$5,200/mo',
            submittedDate: new Date(Date.now() - 86400000).toISOString(),
            lastContact: '1 day ago',
            phone: '+1 (555) 777-8888',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
            id: 'app-5',
            name: 'Robert Miller',
            email: 'r.miller@example.com',
            propertyInterested: 'Cozy Cottage',
            status: 'Approved',
            score: 84,
            budget: '$1,400/mo',
            submittedDate: new Date(Date.now() - 259200000).toISOString(),
            lastContact: '3 days ago',
            phone: '+1 (555) 999-0000',
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            updatedAt: new Date(Date.now() - 259200000).toISOString(),
        }
    ];

    return {
        data: mockApplications,
        error: null,
    };
};

/**
 * Fetch a single application by ID
 */
export const getApplicationById = async (applicationId: string): Promise<ApplicationResponse> => {
    const apps = (await getApplications()).data || [];
    const app = apps.find(a => a.id === applicationId);

    if (!app) {
        return { error: 'Application not found', data: null };
    }

    return { data: app, error: null };
};
