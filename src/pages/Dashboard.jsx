import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import DashLayout from '../components/dashboard/DashLayout';
import BuyCreditsModal from '../components/BuyCreditsModal';

// Student views
import StudentHome from './dashboard/student/StudentHome';
import BookingView from './dashboard/student/BookingView';
import MyLessons from './dashboard/student/MyLessons';
import StudentCredits from './dashboard/student/StudentCredits';
import StudentProgress from './dashboard/student/StudentProgress';

// Admin views
import AdminHome from './dashboard/admin/AdminHome';
import AdminStudents from './dashboard/admin/AdminStudents';
import AdminStudentDetail from './dashboard/admin/AdminStudentDetail';
import ResourcesView from './dashboard/ResourcesView';
import AdminBookings from './dashboard/admin/AdminBookings';
import AdminLessons from './dashboard/admin/AdminLessons';
import AdminSchedule from './dashboard/admin/AdminSchedule';
import AdminBilling from './dashboard/admin/AdminBilling';
import AdminEnquiries from './dashboard/admin/AdminEnquiries';
import AdminChat from './dashboard/admin/AdminChat';
import StudentChat from './dashboard/student/StudentChat';

const STUDENT_DEFAULT = 'home';
const ADMIN_DEFAULT = 'admin-home';

export default function Dashboard() {
  const { currentUser, openModal, closeModal } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const navigate = useNavigate();
  const { view, id } = useParams();
  const defaultView = isAdmin ? ADMIN_DEFAULT : STUDENT_DEFAULT;
  const activeView = view || defaultView;

  const handleBuyCredits = () => {
    openModal('Buy Lesson Credits', <BuyCreditsModal onClose={closeModal} />);
  };

  // Each section has its own address (/dashboard/booking …) so the browser Back button works.
  const switchView = (v) => navigate(v === defaultView ? '/dashboard' : `/dashboard/${v}`);

  const renderView = () => {
    // ── ADMIN VIEWS ──
    if (isAdmin) {
      switch (activeView) {
        case 'admin-home':      return <AdminHome onSwitch={switchView} />;
        case 'admin-students':  return id ? <AdminStudentDetail key={id} id={id} /> : <AdminStudents />;
        case 'admin-bookings':  return <AdminBookings />;
        case 'admin-lessons':   return <AdminLessons />;
        case 'admin-resources': return <ResourcesView admin />;
        case 'admin-billing':   return <AdminBilling />;
        case 'admin-messages':  return <AdminChat id={id} />;
        case 'admin-enquiries': return <AdminEnquiries />;
        case 'admin-settings':  return <AdminSchedule />;
        default:                return <AdminHome onSwitch={switchView} />;
      }
    }

    // ── STUDENT VIEWS ──
    switch (activeView) {
      case 'home':      return <StudentHome onSwitch={switchView} onBuyCredits={handleBuyCredits} />;
      case 'booking':   return <BookingView onBuyCredits={handleBuyCredits} />;
      case 'lessons':   return <MyLessons onSwitch={switchView} />;
      case 'chat':      return <StudentChat />;
      case 'resources': return <ResourcesView />;
      case 'credits':   return <StudentCredits onBuyCredits={handleBuyCredits} />;
      case 'progress':  return <StudentProgress onSwitch={switchView} />;
      default:          return <StudentHome onSwitch={switchView} onBuyCredits={handleBuyCredits} />;
    }
  };

  return (
    <DashLayout activeView={activeView} onSwitch={switchView}>
      <div key={`${activeView}/${id || ''}`} className="view-enter">{renderView()}</div>
    </DashLayout>
  );
}
