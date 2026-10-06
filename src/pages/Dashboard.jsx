import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import DashLayout from '../components/dashboard/DashLayout';
import BuyCreditsModal from '../components/BuyCreditsModal';

// Student views
import StudentHome from './dashboard/student/StudentHome';
import BookingView from './dashboard/student/BookingView';
import MyLessons from './dashboard/student/MyLessons';

// Admin views
import AdminHome from './dashboard/admin/AdminHome';
import AdminStudents from './dashboard/admin/AdminStudents';
import AdminBookings from './dashboard/admin/AdminBookings';
import AdminLessons from './dashboard/admin/AdminLessons';
import AdminSchedule from './dashboard/admin/AdminSchedule';
import AdminBilling from './dashboard/admin/AdminBilling';

// Placeholder for views not yet broken into separate files
function Placeholder({ title }) {
  return (
    <>
      <div className="dash-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="dash-main">
        <div className="card card-pad" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚧</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.2rem', color: 'var(--navy)', marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: '.85rem', color: 'var(--ink-muted)', fontWeight: 300 }}>This section is ready — expand it in its own file under src/pages/dashboard/</div>
        </div>
      </div>
    </>
  );
}

const STUDENT_DEFAULT = 'home';
const ADMIN_DEFAULT = 'admin-home';

export default function Dashboard() {
  const { currentUser, openModal, closeModal } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const navigate = useNavigate();
  const { view } = useParams();
  const defaultView = isAdmin ? ADMIN_DEFAULT : STUDENT_DEFAULT;
  const activeView = view || defaultView;

  const handleBuyCredits = () => {
    openModal('🎟 Buy Lesson Credits', <BuyCreditsModal onClose={closeModal} />);
  };

  // Each section has its own address (/dashboard/booking …) so the browser Back button works.
  const switchView = (v) => navigate(v === defaultView ? '/dashboard' : `/dashboard/${v}`);

  const renderView = () => {
    // ── ADMIN VIEWS ──
    if (isAdmin) {
      switch (activeView) {
        case 'admin-home':      return <AdminHome onSwitch={switchView} />;
        case 'admin-students':  return <AdminStudents />;
        case 'admin-bookings':  return <AdminBookings />;
        case 'admin-lessons':   return <AdminLessons />;
        case 'admin-resources': return <Placeholder title="Resources" />;
        case 'admin-billing':   return <AdminBilling />;
        case 'admin-settings':  return <AdminSchedule />;
        default:                return <AdminHome onSwitch={switchView} />;
      }
    }

    // ── STUDENT VIEWS ──
    switch (activeView) {
      case 'home':      return <StudentHome onSwitch={switchView} onBuyCredits={handleBuyCredits} />;
      case 'booking':   return <BookingView onBuyCredits={handleBuyCredits} />;
      case 'lessons':   return <MyLessons onSwitch={switchView} />;
      case 'resources': return <Placeholder title="Resources" />;
      case 'credits':   return <Placeholder title="Credits & Billing" />;
      case 'progress':  return <Placeholder title="My Progress" />;
      default:          return <StudentHome onSwitch={switchView} onBuyCredits={handleBuyCredits} />;
    }
  };

  return (
    <DashLayout activeView={activeView} onSwitch={switchView}>
      {renderView()}
    </DashLayout>
  );
}
