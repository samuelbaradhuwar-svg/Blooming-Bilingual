import DashHeader from '../../../components/dashboard/DashHeader';
import ChatThread from '../../../components/ChatThread';
import Icon from '../../../components/ui/Icon';
import { useApp } from '../../../context/AppContext';

// A private chat between the student and Neeliën.
export default function StudentChat() {
  const { currentUser } = useApp();
  return (
    <>
      <DashHeader title="Chat with Neeliën" />
      <div className="dash-main">
        <p className="fine-print" style={{ margin: '0 0 12px' }}><Icon name="lock" /> Private: only you and Neeliën can read this conversation.</p>
        <ChatThread studentId={currentUser.id} otherName="Neeliën" />
      </div>
    </>
  );
}
