// Mock data for Brokers Community

export type AuthorRole = 'manager' | 'broker';
export type PostTag = 'urgent' | 'deal' | 'announcement' | 'info';
export type PostVisibility = 'all' | 'brokers' | 'managers';

export interface Comment {
    commentId: string;
    authorName: string;
    authorRole: AuthorRole;
    content: string;
    createdAt: Date;
}

export interface CommunityPost {
    postId: string;
    authorName: string;
    authorRole: AuthorRole;
    content: string;
    tag: PostTag;
    createdAt: Date;
    likesCount: number;
    commentsCount: number;
    comments: Comment[];
    isPinned: boolean;
    visibility: PostVisibility;
}

export const communityPosts: CommunityPost[] = [
    {
        postId: 'post-001',
        authorName: 'Rajesh Kumar',
        authorRole: 'manager',
        content: '🚨 URGENT: Client ready to close deal for 3BHK in Koramangala within 48 hours. Budget: £450K. Looking for properties with immediate possession. Please share relevant listings ASAP!',
        tag: 'urgent',
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
        likesCount: 8,
        commentsCount: 3,
        comments: [
            { commentId: 'c-001-1', authorName: 'Priya Sharma', authorRole: 'broker', content: 'I have 2 properties that match this requirement. Will share details in DM.', createdAt: new Date(Date.now() - 10 * 60 * 1000) },
            { commentId: 'c-001-2', authorName: 'Amit Patel', authorRole: 'broker', content: 'Can the client consider a 2-bed? I have an excellent option ready for possession.', createdAt: new Date(Date.now() - 8 * 60 * 1000) },
            { commentId: 'c-001-3', authorName: 'Rajesh Kumar', authorRole: 'manager', content: '@Amit Client specifically needs 3BHK, but please share the details anyway for reference.', createdAt: new Date(Date.now() - 5 * 60 * 1000) },
        ],
        isPinned: true,
        visibility: 'all',
    },
    {
        postId: 'post-002',
        authorName: 'Priya Sharma',
        authorRole: 'broker',
        content: 'Deal Alert: Successfully closed a 2BHK apartment in Whitefield at £380K. Client was looking for ready-to-move property with parking. Total turnaround time: 5 days from first viewing to agreement signing.',
        tag: 'deal',
        createdAt: new Date(Date.now() - 45 * 60 * 1000),
        likesCount: 12,
        commentsCount: 5,
        comments: [
            { commentId: 'c-002-1', authorName: 'Karthik Rao', authorRole: 'manager', content: 'Congratulations! Great work on the quick turnaround.', createdAt: new Date(Date.now() - 40 * 60 * 1000) },
            { commentId: 'c-002-2', authorName: 'Vikram Singh', authorRole: 'broker', content: 'Amazing! What was the key factor that closed it so quickly?', createdAt: new Date(Date.now() - 35 * 60 * 1000) },
            { commentId: 'c-002-3', authorName: 'Priya Sharma', authorRole: 'broker', content: 'Thanks! The property was exactly what they wanted and pricing was competitive.', createdAt: new Date(Date.now() - 30 * 60 * 1000) },
            { commentId: 'c-002-4', authorName: 'Anjali Mehta', authorRole: 'broker', content: 'Well done! This motivates all of us.', createdAt: new Date(Date.now() - 25 * 60 * 1000) },
            { commentId: 'c-002-5', authorName: 'Deepak Joshi', authorRole: 'broker', content: '🎉 Fantastic achievement!', createdAt: new Date(Date.now() - 20 * 60 * 1000) },
        ],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-003',
        authorName: 'Amit Patel',
        authorRole: 'broker',
        content: 'Hot Property: Premium 4BHK penthouse available for rent. Owner is motivated, willing to negotiate. Rent: £2,500/month. Property has excellent amenities and immediate possession.',
        tag: 'deal',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        likesCount: 6,
        commentsCount: 2,
        comments: [
            { commentId: 'c-003-1', authorName: 'Meera Nair', authorRole: 'broker', content: 'Is parking included? How many covered spots?', createdAt: new Date(Date.now() - 90 * 60 * 1000) },
            { commentId: 'c-003-2', authorName: 'Amit Patel', authorRole: 'broker', content: 'Yes, 2 covered parking spots included.', createdAt: new Date(Date.now() - 80 * 60 * 1000) },
        ],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-004',
        authorName: 'Sneha Reddy',
        authorRole: 'manager',
        content: '📢 Announcement: New property documentation checklist has been updated. Please ensure all listings include: Title deed copy, Tax receipts, NOC from society, and Encumbrance certificate. This will speed up deal closure significantly.',
        tag: 'announcement',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        likesCount: 15,
        commentsCount: 4,
        comments: [],
        isPinned: true,
        visibility: 'all',
    },
    {
        postId: 'post-005',
        authorName: 'Vikram Singh',
        authorRole: 'broker',
        content: 'Client Requirement: Looking for commercial space, 1500-2000 sqft, ground floor preferred. Budget: £3,500/month. Client is a professional firm, needs immediate possession. Anyone has leads?',
        tag: 'urgent',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        likesCount: 4,
        commentsCount: 1,
        comments: [],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-006',
        authorName: 'Anjali Mehta',
        authorRole: 'broker',
        content: 'Just had a viewing at the new gated community in Sarjapur Road. Property quality is excellent, pricing is competitive. Owner is open to lease-to-own arrangements. Great opportunity for serious buyers!',
        tag: 'info',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        likesCount: 7,
        commentsCount: 2,
        comments: [],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-007',
        authorName: 'Karthik Rao',
        authorRole: 'manager',
        content: 'Team Update: Fast-track cases have increased by 40% this month. Great work everyone! Let\'s maintain this momentum. Remember to update case status daily and coordinate with legal team for document verification.',
        tag: 'announcement',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        likesCount: 18,
        commentsCount: 6,
        comments: [],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-008',
        authorName: 'Deepak Joshi',
        authorRole: 'broker',
        content: 'Property Alert: Luxury villa in North Bangalore, 5BHK with private pool and garden. Owner relocating abroad, highly motivated to close quickly. Sale price: £1.2M (negotiable). Premium location with great connectivity.',
        tag: 'deal',
        createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
        likesCount: 9,
        commentsCount: 3,
        comments: [],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-009',
        authorName: 'Meera Nair',
        authorRole: 'broker',
        content: '🔥 URGENT: Client needs 2BHK for rent, budget £1,200/month, immediate move-in required. Family of 3, working professionals. Please share available options within 2 hours!',
        tag: 'urgent',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        likesCount: 5,
        commentsCount: 4,
        comments: [],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-010',
        authorName: 'Suresh Babu',
        authorRole: 'manager',
        content: 'FYI: Bank holiday on Monday. Please plan your property registrations and document submissions accordingly. Legal team will be unavailable. Schedule important closures for Tuesday onwards.',
        tag: 'info',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        likesCount: 10,
        commentsCount: 1,
        comments: [],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-011',
        authorName: 'Pooja Gupta',
        authorRole: 'broker',
        content: 'Success Story: Closed a challenging deal for a 3BHK. Client had specific requirements which we managed to fulfill. Deal value: £520K. Thanks to the team for coordination and support!',
        tag: 'deal',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        likesCount: 14,
        commentsCount: 7,
        comments: [],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-012',
        authorName: 'Arjun Malhotra',
        authorRole: 'broker',
        content: 'Market Update: Rental demand in the area has increased by 25% this quarter. Properties near transport links are getting snapped up quickly. Good time to list properties in that corridor.',
        tag: 'info',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        likesCount: 11,
        commentsCount: 2,
        comments: [],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-013',
        authorName: 'Nikhil Desai',
        authorRole: 'manager',
        content: '📢 Policy Update: All broker commissions will now be processed within 7 working days post deal closure. Please ensure all paperwork is submitted complete to avoid delays.',
        tag: 'announcement',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        likesCount: 20,
        commentsCount: 8,
        comments: [],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-014',
        authorName: 'Ravi Krishnan',
        authorRole: 'broker',
        content: 'Just finalized a property for a young couple. They were first-time buyers and we guided them through the entire process. Deal completed smoothly with loan approval in 10 days. Happy clients!',
        tag: 'deal',
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        likesCount: 13,
        commentsCount: 4,
        comments: [],
        isPinned: false,
        visibility: 'all',
    },
];
