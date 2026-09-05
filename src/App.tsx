import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastContainer } from './components/common/ToastContainer';
import { Header } from './components/common/Header';
import { SimulationToolbar } from './components/simulation/SimulationToolbar';

// Auth
import { LoginLanding } from './components/auth/LoginLanding';

// Student screens
import { StudentAccessCheck } from './components/student/StudentAccessCheck';
import { PasswordSetup } from './components/student/PasswordSetup';
import { FaceEnrollment } from './components/student/FaceEnrollment';
import { FaceVerificationLogin } from './components/student/FaceVerificationLogin';
import { ExamInfoRules } from './components/student/ExamInfoRules';
import { ExamSessionView } from './components/student/ExamSessionView';
import { ViolationOverlay } from './components/student/ViolationOverlay';
import { StudentExamProgressStepper } from './components/student/StudentExamProgressStepper';

// Teacher screens
import { TeacherSidebar } from './components/teacher/TeacherSidebar';
import { TeacherOnboarding } from './components/teacher/TeacherOnboarding';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { CourseExamSessionManager } from './components/teacher/CourseExamSessionManager';
import { StudentGroupManager } from './components/teacher/StudentGroupManager';
import { SeatAssignmentManager } from './components/teacher/SeatAssignmentManager';
import { LiveExamMonitoring } from './components/teacher/LiveExamMonitoring';
import { AnswerFileRepository } from './components/teacher/AnswerFileRepository';
import { TeacherProfile } from './components/teacher/TeacherProfile';

// Admin screens
import { AdminSidebar } from './components/admin/AdminSidebar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserRoleManager } from './components/admin/UserRoleManager';
import { RoomComputerSetup } from './components/admin/RoomComputerSetup';
import { BiometricReferenceManager } from './components/admin/BiometricReferenceManager';
import { CheatDetectionConfig } from './components/admin/CheatDetectionConfig';
import { SystemAuditLog } from './components/admin/SystemAuditLog';
import { AdminProfile } from './components/admin/AdminProfile';

const MainRouter: React.FC = () => {
  const {
    role,
    activeStudentStep,
    currentTeacher,
    activeTeacherRoute,
    activeAdminRoute,
  } = useApp();

  const [teacherSidebarCollapsed, setTeacherSidebarCollapsed] = useState(false);
  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false);

  // 1. Unauthenticated SSO Landing (Screen S0)
  if (!role) {
    return <LoginLanding />;
  }

  // 2. Student Flow (Screens ST1 -> ST7 + ST8 Violation Overlay)
  if (role === 'student') {
    const isExamSessionStep = activeStudentStep === 'ST4' ||
      activeStudentStep === 'ST5' ||
      activeStudentStep === 'ST6' ||
      activeStudentStep === 'ST7';
    const earlyProgressStep = activeStudentStep === 'ST3' ? 2 : 1;

    return (
      <div className="relative flex min-h-screen flex-col justify-start overflow-visible bg-gray-50 text-gray-900 selection:bg-blue-600 selection:text-white">
        <ViolationOverlay />

        {!isExamSessionStep && (
          <>
            <div className="sticky top-0 z-50 w-full bg-white">
              <StudentExamProgressStepper currentStep={earlyProgressStep} />
            </div>

            <main className="relative z-[1] flex-1 overflow-visible bg-gray-50">
              {activeStudentStep === 'ST1' && <StudentAccessCheck />}
              {activeStudentStep === 'ST2A' && <PasswordSetup />}
              {activeStudentStep === 'ST2B' && <FaceEnrollment />}
              {activeStudentStep === 'ST2C' && <FaceVerificationLogin />}
              {activeStudentStep === 'ST3' && <ExamInfoRules />}
            </main>
          </>
        )}

        {(activeStudentStep === 'ST4' ||
          activeStudentStep === 'ST5' ||
          activeStudentStep === 'ST6' ||
          activeStudentStep === 'ST7') && <ExamSessionView />}
      </div>
    );
  }

  // 3. Teacher Flow (Screens T0 -> T9)
  if (role === 'teacher') {
    // Check if first-time onboarding needed
    if (currentTeacher?.isFirstTime) {
      return (
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="p-6">
            <TeacherOnboarding />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <TeacherSidebar
            collapsed={teacherSidebarCollapsed}
            onToggle={() => setTeacherSidebarCollapsed(!teacherSidebarCollapsed)}
          />

          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
              {activeTeacherRoute === 'T1' && <TeacherDashboard />}
              {activeTeacherRoute === 'T2' && <CourseExamSessionManager />}
              {activeTeacherRoute === 'T3' && <StudentGroupManager />}
              {activeTeacherRoute === 'T4' && <SeatAssignmentManager />}
              {(activeTeacherRoute === 'T5' || activeTeacherRoute === 'T6') && (
                <LiveExamMonitoring />
              )}
              {(activeTeacherRoute === 'T7' || activeTeacherRoute === 'T8') && (
                <AnswerFileRepository />
              )}
              {activeTeacherRoute === 'T9' && <TeacherProfile />}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // 4. Admin Flow (Screens A1 -> A12)
  if (role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <AdminSidebar
            collapsed={adminSidebarCollapsed}
            onToggle={() => setAdminSidebarCollapsed(!adminSidebarCollapsed)}
          />

          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
              {activeAdminRoute === 'A1' && <AdminDashboard />}
              {(activeAdminRoute === 'A2' || activeAdminRoute === 'A3') && (
                <UserRoleManager />
              )}
              {(activeAdminRoute === 'A4' || activeAdminRoute === 'A5') && (
                <RoomComputerSetup />
              )}
              {(activeAdminRoute === 'A6' || activeAdminRoute === 'A7') && (
                <BiometricReferenceManager />
              )}
              {(activeAdminRoute === 'A8' || activeAdminRoute === 'A9') && (
                <CheatDetectionConfig />
              )}
              {(activeAdminRoute === 'A10' || activeAdminRoute === 'A11') && (
                <SystemAuditLog />
              )}
              {activeAdminRoute === 'A12' && <AdminProfile />}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return null;
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900 antialiased selection:bg-blue-600 selection:text-white">
        {/* Simulation Toolbar for easy reviewer testing */}
        <SimulationToolbar />

        {/* Global Toast Notifications */}
        <ToastContainer />

        {/* Main Application Router */}
        <div className="flex-1 flex flex-col">
          <MainRouter />
        </div>
      </div>
    </AppProvider>
  );
}
