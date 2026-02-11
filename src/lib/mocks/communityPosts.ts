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

// Generate mock posts (minimum 12 with mixed roles & tags)
export const communityPosts: CommunityPost[] = [
    {
        postId: 'post-001',
        authorName: 'Rajesh Kumar',
        authorRole: 'manager',
        content: '🚨 URGENT: Client ready to close deal for 3BHK in Koramangala within 48 hours. Budget: ₹45L. Looking for properties with immediate possession. Please share relevant listings ASAP!',
        tag: 'urgent',
        createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
        likesCount: 8,
        commentsCount: 3,
        comments: [
            {
                commentId: 'comment-001-1',
                authorName: 'Priya Sharma',
                authorRole: 'broker',
                content: 'I have 2 properties in Koramangala that match this requirement. Will share details in DM.',
                createdAt: new Date(Date.now() - 10 * 60 * 1000),
            },
            {
                commentId: 'comment-001-2',
                authorName: 'Amit Patel',
                authorRole: 'broker',
                content: 'Can the client consider 2.5BHK? I have an excellent option ready for possession.',
                createdAt: new Date(Date.now() - 8 * 60 * 1000),
            },
            {
                commentId: 'comment-001-3',
                authorName: 'Rajesh Kumar',
                authorRole: 'manager',
                content: '@Amit Client specifically needs 3BHK, but please share the details anyway for reference.',
                createdAt: new Date(Date.now() - 5 * 60 * 1000),
            },
        ],
        isPinned: true,
        visibility: 'all',
    },
    {
        postId: 'post-002',
        authorName: 'Priya Sharma',
        authorRole: 'broker',
        content: 'Deal Alert: Successfully closed a 2BHK apartment in Whitefield at ₹38L. Client was looking for ready-to-move property with parking. Total turnaround time: 5 days from first viewing to agreement signing.',
        tag: 'deal',
        createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
        likesCount: 12,
        commentsCount: 5,
        comments: [
            { commentId: 'comment-002-1', authorName: 'Karthik Rao', authorRole: 'manager', content: 'Congratulations! Great work on the quick turnaround.', createdAt: new Date(Date.now() - 40 * 60 * 1000) },
            { commentId: 'comment-002-2', authorName: 'Vikram Singh', authorRole: 'broker', content: 'Amazing! What was the key factor that closed it so quickly?', createdAt: new Date(Date.now() - 35 * 60 * 1000) },
            { commentId: 'comment-002-3', authorName: 'Priya Sharma', authorRole: 'broker', content: 'Thanks! The property was exactly what they wanted and pricing was competitive.', createdAt: new Date(Date.now() - 30 * 60 * 1000) },
            { commentId: 'comment-002-4', authorName: 'Anjali Mehta', authorRole: 'broker', content: 'Well done! This motivates all of us.', createdAt: new Date(Date.now() - 25 * 60 * 1000) },
            { commentId: 'comment-002-5', authorName: 'Deepak Joshi', authorRole: 'broker', content: '🎉 Fantastic achievement!', createdAt: new Date(Date.now() - 20 * 60 * 1000) },
        ],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-003',
        authorName: 'Amit Patel',
        authorRole: 'broker',
        content: 'Hot Property: Premium 4BHK penthouse in Indiranagar available for rent. Owner is motivated, willing to negotiate. Rent: ₹85K/month. Property has excellent amenities and immediate possession.',
        tag: 'deal',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        likesCount: 6,
        commentsCount: 2,
        comments: [
            { commentId: 'comment-003-1', authorName: 'Meera Nair', authorRole: 'broker', content: 'Is parking included? How many covered spots?', createdAt: new Date(Date.now() - 90 * 60 * 1000) },
            { commentId: 'comment-003-2', authorName: 'Amit Patel', authorRole: 'broker', content: 'Yes, 2 covered parking spots included.', createdAt: new Date(Date.now() - 80 * 60 * 1000) },
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
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
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
        content: 'Client Requirement: Looking for commercial space in HSR Layout, 1500-2000 sqft, ground floor preferred. Budget: ₹1.2L/month. Client is a CA firm, needs immediate possession. Anyone has leads?',
        tag: 'urgent',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
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
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
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
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
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
        content: 'Property Alert: Luxury villa in North Bangalore, 5BHK with private pool and garden. Owner relocating abroad, highly motivated to close quickly. Sale price: ₹2.8Cr (negotiable). Premium location with great connectivity.',
        tag: 'deal',
        createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
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
        content: '🔥 URGENT: Client needs 2BHK in Electronic City for rent, budget ₹25K/month, immediate move-in required. Family of 3, working professionals. Please share available options within 2 hours!',
        tag: 'urgent',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
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
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
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
        content: 'Success Story: Closed a challenging deal for a 3BHK in Marathahalli. Client had specific Vastu requirements which we managed to fulfill. Deal value: ₹52L. Thanks to the team for coordination and support!',
        tag: 'deal',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
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
        content: 'Market Update: Rental demand in Bellandur area has increased by 25% this quarter. Properties near metro stations are getting snapped up quickly. Good time to list properties in that corridor.',
        tag: 'info',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        likesCount: 11,
        commentsCount: 2,
        comments: [],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-013',
        authorName: 'Kavita Iyer',
        authorRole: 'broker',
        content: 'Client requirement: NRI looking for investment property in Bangalore. Budget: ₹80L-₹1Cr. Prefers areas with good appreciation potential. Any suggestions for established localities with growth prospects?',
        tag: 'info',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        likesCount: 8,
        commentsCount: 5,
        comments: [],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-014',
        authorName: 'Nikhil Desai',
        authorRole: 'manager',
        content: '📢 Policy Update: All broker commissions will now be processed within 7 working days post deal closure. Please ensure all paperwork is submitted complete to avoid delays. Contact accounts team for any clarifications.',
        tag: 'announcement',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        likesCount: 20,
        commentsCount: 8,
        comments: [],
        isPinned: false,
        visibility: 'all',
    },
    {
        postId: 'post-015',
        authorName: 'Ravi Krishnan',
        authorRole: 'broker',
        content: 'Just finalized a property in JP Nagar for a young couple. They were first-time buyers and we guided them through the entire process. Deal completed smoothly with bank loan approval in 10 days. Happy clients!',
        tag: 'deal',
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        likesCount: 13,
        commentsCount: 4,
        comments: [],
        isPinned: false,
        visibility: 'all',
    },
];

