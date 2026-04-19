import RoleDocsPage from '@/components/docs/RoleDocsPage';
import { userDocs } from '@/lib/roleDocsContent';

export default function UserDashboardDocsPage() {
    return <RoleDocsPage config={userDocs.config} docsDocument={userDocs.document} />;
}
