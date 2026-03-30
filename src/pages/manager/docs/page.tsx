import RoleDocsPage from '@/components/docs/RoleDocsPage';
import { managerDocs } from '@/lib/roleDocsContent';

export default function ManagerDocsPage() {
    return <RoleDocsPage config={managerDocs.config} docsDocument={managerDocs.document} />;
}
