export function getRedirectPath(role: string): string {
    switch (role) {
        case 'admin':
            return '/admin/dashboard';
        case 'manager':
            return '/manager/dashboard';
        case 'user':
        default:
            return '/user/dashboard';
    }
}
