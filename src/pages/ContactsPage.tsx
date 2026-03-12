import { useAuth } from '@/contexts/AuthContext';
import StaffContacts from './contacts/StaffContacts';
import ClientContactView from './contacts/ClientContactView';

const ContactsPage = () => {
  const { isCliente, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-6 h-6 border-2 border-muted border-t-muted-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (isCliente) {
    return <ClientContactView />;
  }

  return <StaffContacts />;
};

export default ContactsPage;
