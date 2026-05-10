import { RoleSelector } from '@/components/role-selector';
import { InMemoryDataBanner } from '@/generated/components/in-memory-data-banner';
import { HAS_IN_MEMORY_TABLES } from '@/generated/hooks';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <InMemoryDataBanner 
        show={HAS_IN_MEMORY_TABLES} 
        message="⚠️ Demo Mode: Data will not persist after refresh. To enable permanent storage, an admin must provision Dataverse or SharePoint tables."
        className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
      />
      <RoleSelector />
    </div>
  );
}
