import { Link } from 'react-router-dom';

const UPDATED = '6 October 2026';

function Page({ label, title, children }) {
  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="section-label">{label}</div>
          <h1 className="section-title">{title}</h1>
          <p className="section-sub">Last updated {UPDATED}</p>
        </div>
      </div>
      <section className="section">
        <div className="section-inner" style={{ maxWidth: 760 }}>
          <div className="legal">{children}</div>
        </div>
      </section>
    </>
  );
}

export function Privacy() {
  return (
    <Page label="Legal" title="Privacy Policy">
      <p>
        The Blooming Bilingual is an online English tutoring service run by Neeliën Van Rooyen ("I", "me", "my").
        This page explains what personal information the website collects, why, and what your choices are.
        If you have any question about it, please get in touch through the <Link to="/contact">Contact page</Link>.
      </p>

      <h2>What I collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address, country and time zone, and a password (stored securely by our sign-in provider; I can never see it).</li>
        <li><strong>Lessons:</strong> the lessons you book, their date and time, the subject, and the video link for each lesson.</li>
        <li><strong>Credits and payments:</strong> your credit balance and purchase history. Card and bank details are entered with our payment providers and are never stored on this website.</li>
        <li><strong>Learning information:</strong> lesson notes, your English level, and plans or homework set for you.</li>
        <li><strong>Files:</strong> files you upload for me, and files I send you. These are private between you and me.</li>
      </ul>

      <h2>Why I use it</h2>
      <ul>
        <li>To create your account, let you book and manage lessons, and run the lessons.</li>
        <li>To send you lesson invitations and reminders by email.</li>
        <li>To keep records of credits and payments, and to meet legal and tax obligations.</li>
        <li>To teach you better, using your level, notes and the files you share.</li>
      </ul>

      <h2>Who it is shared with</h2>
      <p>I do not sell your information. It is processed on my behalf by these services, only so the website works:</p>
      <ul>
        <li><strong>Supabase</strong>: database, sign-in and file storage.</li>
        <li><strong>Vercel</strong>: website hosting.</li>
        <li><strong>Google</strong>: Google Calendar and Google Meet, which create your lesson video link and send your calendar invitation (your name and email address are shared with Google for this).</li>
        <li><strong>PayPal</strong>: processes payments. Your card or PayPal details are entered with PayPal, not on this website.</li>
      </ul>
      <p>These providers may store data in other countries. Each has its own privacy policy.</p>

      <h2>Who can see your information</h2>
      <p>
        Only you and I can see your lessons, notes and files. Other students cannot see anything about you.
        Your information is protected by account sign-in and access rules in our database.
      </p>

      <h2>How long I keep it</h2>
      <p>
        I keep your information while your account is active. Payment and credit records may be kept for as long as the law requires.
        You can ask me to delete your account and personal information at any time.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to see the information I hold about you, correct it, or have it deleted, and you can object to how I use it.
        Contact me through the <Link to="/contact">Contact page</Link> and I will reply as soon as I can.
        If you are in South Africa you may also contact the Information Regulator; if you are in the EU or UK, your local data protection authority.
      </p>

      <h2>Children</h2>
      <p>
        If you are under 18, a parent or guardian must set up the account and agree to this policy on your behalf.
      </p>

      <h2>Cookies</h2>
      <p>
        The site stores a small sign-in token in your browser so you stay logged in. It does not use advertising or tracking cookies.
      </p>

      <h2>Changes</h2>
      <p>If I change this policy I will update the date at the top of this page.</p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page label="Legal" title="Terms of Service">
      <p>
        These terms apply when you use The Blooming Bilingual, an online English tutoring service run by Neeliën Van Rooyen ("I", "me").
        By creating an account or booking a lesson you agree to them.
      </p>

      <h2>Lessons</h2>
      <ul>
        <li>Lessons are one-to-one, online, and last 45 minutes.</li>
        <li>Each lesson uses <strong>1 credit</strong>.</li>
        <li>Times are shown in your own time zone. Please check the time before you confirm a booking.</li>
        <li>A video link (Google Meet) is created for each lesson and sent to you by calendar invitation.</li>
      </ul>

      <h2>Credits and payment</h2>
      <ul>
        <li>Credits are bought in packs. The price shown at checkout is the price you pay.</li>
        <li>Credits do not expire.</li>
        <li>Credits are for your own use and cannot be transferred or exchanged for money, except as set out below.</li>
        <li>Payments are handled by third-party payment providers. I do not see or store your card details.</li>
      </ul>

      <h2>Cancelling and rescheduling</h2>
      <ul>
        <li>If you cancel or reschedule <strong>more than 2 hours</strong> before the lesson starts, there is no charge: a cancelled lesson's credit is returned, and a rescheduled lesson keeps its credit.</li>
        <li>If you cancel <strong>within 2 hours</strong> of the start, the credit is not returned, and the lesson can no longer be rescheduled.</li>
        <li>If you do not attend, the credit is used.</li>
        <li>If I need to cancel a lesson, your credit is always returned in full.</li>
      </ul>

      <h2>Refunds</h2>
      <p>
        Unused credits may be refunded on request within a reasonable time of purchase. Contact me through the <Link to="/contact">Contact page</Link>.
        Nothing in these terms limits your legal rights as a consumer.
      </p>

      <h2>Using the website</h2>
      <ul>
        <li>Keep your sign-in details private and tell me if you think someone else has used your account.</li>
        <li>Be respectful in lessons. I may end a lesson or an account for abusive behaviour.</li>
        <li>Upload only files you have the right to share. Lesson materials remain mine and are for your personal study.</li>
        <li>Do not record lessons without my agreement.</li>
      </ul>

      <h2>Limits of the service</h2>
      <p>
        I teach with care, but I cannot guarantee particular exam results or learning outcomes.
        The website is provided as is; sometimes it may be unavailable. To the extent the law allows, I am not liable for indirect losses.
      </p>

      <h2>Privacy</h2>
      <p>How I handle your information is explained in the <Link to="/privacy">Privacy Policy</Link>.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of South Africa.</p>

      <h2>Changes</h2>
      <p>I may update these terms. The date at the top shows when they last changed.</p>
    </Page>
  );
}
