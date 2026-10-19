import DashHeader from '../../../components/dashboard/DashHeader';
import ChatThread from '../../../components/ChatThread';
import Icon from '../../../components/ui/Icon';
import { useApp } from '../../../context/AppContext';
import { PersonAvatar } from '../../../components/ui/avatars';

// A private chat between the student and Neeliën.
export default function StudentChat() {
  const { currentUser } = useApp();
  return (
    <>
      <DashHeader title="Chat with Neeliën" />
      <div className="dash-main">
        <p className="fine-print chat-intro"><PersonAvatar className="avatar chat-intro-avatar" tutor initials="N" /><span><Icon name="lock" /> Private: only you and Neeliën can read this conversation.</span></p>
        <ChatThread studentId={currentUser.id} otherName="Neeliën" />
      </div>
    </>
  );
}
