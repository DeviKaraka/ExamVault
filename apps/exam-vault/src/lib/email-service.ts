// Email notification service for ExamVault
// In production, this would integrate with Microsoft Graph API, SendGrid, or similar

export interface EmailNotification {
  to: string;
  toName: string;
  subject: string;
  body: string;
  htmlBody?: string;
}

export interface EmailSettings {
  enabled: boolean;
  sendOnSubmission: boolean;
  sendOnGradeRelease: boolean;
  sendProgressUpdates: boolean;
  includeDetailedScores: boolean;
  customSignature?: string;
}

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  enabled: true,
  sendOnSubmission: true,
  sendOnGradeRelease: true,
  sendProgressUpdates: false,
  includeDetailedScores: true,
};

// Get email settings from localStorage
export const getEmailSettings = (): EmailSettings => {
  try {
    const stored = localStorage.getItem('emailNotificationSettings');
    if (stored) {
      return { ...DEFAULT_EMAIL_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_EMAIL_SETTINGS;
};

// Save email settings to localStorage
export const saveEmailSettings = (settings: EmailSettings): void => {
  localStorage.setItem('emailNotificationSettings', JSON.stringify(settings));
};

// Track sent emails (for demo purposes)
export interface SentEmail {
  id: string;
  to: string;
  toName: string;
  subject: string;
  sentAt: Date;
  status: 'sent' | 'failed' | 'pending';
  type: 'submission' | 'grade_release' | 'progress';
}

// Get sent emails from localStorage
export const getSentEmails = (): SentEmail[] => {
  try {
    const stored = localStorage.getItem('sentEmails');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((e: SentEmail) => ({
        ...e,
        sentAt: new Date(e.sentAt),
      }));
    }
  } catch {
    // Ignore parse errors
  }
  return [];
};

// Save sent email record
const saveSentEmail = (email: SentEmail): void => {
  const current = getSentEmails();
  const updated = [email, ...current].slice(0, 100); // Keep last 100 emails
  localStorage.setItem('sentEmails', JSON.stringify(updated));
};

// Generate email content for exam submission
export const generateSubmissionEmail = (
  studentName: string,
  examTitle: string,
  score: number,
  totalPossible: number,
  percentage: number,
  passed: boolean,
  includeDetails: boolean
): EmailNotification => {
  const passStatus = passed ? '✅ PASSED' : '❌ NEEDS IMPROVEMENT';
  
  const subject = `ExamVault: Your ${examTitle} Results Are In`;
  
  let body = `Hi ${studentName},\n\n`;
  body += `Your exam "${examTitle}" has been submitted and auto-graded.\n\n`;
  
  if (includeDetails) {
    body += `📊 Results Summary:\n`;
    body += `• Score: ${score}/${totalPossible} (${percentage}%)\n`;
    body += `• Status: ${passStatus}\n\n`;
  } else {
    body += `Your results are ready to view in the ExamVault portal.\n\n`;
  }
  
  body += `You can view your detailed results and feedback by logging into ExamVault.\n\n`;
  body += `Keep up the great work!\n\nBest regards,\nExamVault Team`;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📝 ExamVault</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Your Exam Results</p>
      </div>
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="color: #334155; font-size: 16px;">Hi <strong>${studentName}</strong>,</p>
        <p style="color: #334155;">Your exam <strong>"${examTitle}"</strong> has been submitted and auto-graded.</p>
        
        ${includeDetails ? `
        <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <h3 style="color: #1e293b; margin: 0 0 15px 0;">📊 Results Summary</h3>
          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 120px; text-align: center; padding: 15px; background: #f1f5f9; border-radius: 8px;">
              <div style="font-size: 28px; font-weight: bold; color: #6366f1;">${percentage}%</div>
              <div style="color: #64748b; font-size: 14px;">Score</div>
            </div>
            <div style="flex: 1; min-width: 120px; text-align: center; padding: 15px; background: #f1f5f9; border-radius: 8px;">
              <div style="font-size: 28px; font-weight: bold; color: #334155;">${score}/${totalPossible}</div>
              <div style="color: #64748b; font-size: 14px;">Points</div>
            </div>
            <div style="flex: 1; min-width: 120px; text-align: center; padding: 15px; background: ${passed ? '#dcfce7' : '#fee2e2'}; border-radius: 8px;">
              <div style="font-size: 20px; font-weight: bold; color: ${passed ? '#16a34a' : '#dc2626'};">${passed ? 'PASSED' : 'NEEDS WORK'}</div>
              <div style="color: #64748b; font-size: 14px;">Status</div>
            </div>
          </div>
        </div>
        ` : `
        <p style="color: #334155;">Your results are ready to view in the ExamVault portal.</p>
        `}
        
        <p style="color: #334155;">You can view your detailed results and feedback by logging into ExamVault.</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 30px;">Keep up the great work!<br>Best regards,<br><strong>ExamVault Team</strong></p>
      </div>
    </div>
  `;

  return {
    to: '',
    toName: studentName,
    subject,
    body,
    htmlBody,
  };
};

// Generate email content for grade release
export const generateGradeReleaseEmail = (
  studentName: string,
  examTitle: string,
  score: number,
  totalPossible: number,
  percentage: number,
  passed: boolean,
  feedback: string | undefined,
  includeDetails: boolean
): EmailNotification => {
  const passStatus = passed ? '✅ PASSED' : '❌ NEEDS IMPROVEMENT';
  
  const subject = `ExamVault: Final Grades Released for ${examTitle}`;
  
  let body = `Hi ${studentName},\n\n`;
  body += `Great news! Your final grades for "${examTitle}" have been released.\n\n`;
  
  if (includeDetails) {
    body += `📊 Final Results:\n`;
    body += `• Score: ${score}/${totalPossible} (${percentage}%)\n`;
    body += `• Status: ${passStatus}\n\n`;
    
    if (feedback) {
      body += `📝 Teacher Feedback:\n"${feedback}"\n\n`;
    }
  } else {
    body += `Your final grades are ready to view in the ExamVault portal.\n\n`;
  }
  
  body += `Log into ExamVault to view your complete results and detailed feedback.\n\n`;
  body += `Best regards,\nExamVault Team`;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🎓 ExamVault</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Final Grades Released</p>
      </div>
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="color: #334155; font-size: 16px;">Hi <strong>${studentName}</strong>,</p>
        <p style="color: #334155;">Great news! Your final grades for <strong>"${examTitle}"</strong> have been released.</p>
        
        ${includeDetails ? `
        <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <h3 style="color: #1e293b; margin: 0 0 15px 0;">🎯 Final Results</h3>
          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 120px; text-align: center; padding: 15px; background: #f1f5f9; border-radius: 8px;">
              <div style="font-size: 28px; font-weight: bold; color: #059669;">${percentage}%</div>
              <div style="color: #64748b; font-size: 14px;">Final Score</div>
            </div>
            <div style="flex: 1; min-width: 120px; text-align: center; padding: 15px; background: #f1f5f9; border-radius: 8px;">
              <div style="font-size: 28px; font-weight: bold; color: #334155;">${score}/${totalPossible}</div>
              <div style="color: #64748b; font-size: 14px;">Points</div>
            </div>
            <div style="flex: 1; min-width: 120px; text-align: center; padding: 15px; background: ${passed ? '#dcfce7' : '#fee2e2'}; border-radius: 8px;">
              <div style="font-size: 20px; font-weight: bold; color: ${passed ? '#16a34a' : '#dc2626'};">${passed ? 'PASSED' : 'NEEDS WORK'}</div>
              <div style="color: #64748b; font-size: 14px;">Status</div>
            </div>
          </div>
        </div>
        ${feedback ? `
        <div style="background: #fefce8; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #fef08a;">
          <h4 style="color: #854d0e; margin: 0 0 10px 0;">📝 Teacher Feedback</h4>
          <p style="color: #713f12; margin: 0; font-style: italic;">${feedback}</p>
        </div>
        ` : ''}
        ` : `
        <p style="color: #334155;">Your final grades are ready to view in the ExamVault portal.</p>
        `}
        
        <p style="color: #334155;">Log into ExamVault to view your complete results and detailed feedback.</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 30px;">Best regards,<br><strong>ExamVault Team</strong></p>
      </div>
    </div>
  `;

  return {
    to: '',
    toName: studentName,
    subject,
    body,
    htmlBody,
  };
};

// Generate progress update email
export const generateProgressEmail = (
  studentName: string,
  examsTaken: number,
  averageScore: number,
  recentExams: Array<{ title: string; score: number }>
): EmailNotification => {
  const subject = `ExamVault: Your Weekly Progress Update`;
  
  let body = `Hi ${studentName},\n\n`;
  body += `Here's your weekly progress update from ExamVault!\n\n`;
  body += `📊 Summary:\n`;
  body += `• Exams Completed: ${examsTaken}\n`;
  body += `• Average Score: ${averageScore}%\n\n`;
  
  if (recentExams.length > 0) {
    body += `Recent Exams:\n`;
    recentExams.forEach((exam) => {
      body += `• ${exam.title}: ${exam.score}%\n`;
    });
    body += '\n';
  }
  
  body += `Keep up the momentum!\n\nBest regards,\nExamVault Team`;

  return {
    to: '',
    toName: studentName,
    subject,
    body,
  };
};

// Send email (simulated - in production would call actual email API)
export const sendEmail = async (
  notification: EmailNotification,
  type: 'submission' | 'grade_release' | 'progress'
): Promise<{ success: boolean; emailId: string }> => {
  const settings = getEmailSettings();
  
  if (!settings.enabled) {
    return { success: false, emailId: '' };
  }

  // Check if this type of email should be sent
  if (type === 'submission' && !settings.sendOnSubmission) {
    return { success: false, emailId: '' };
  }
  if (type === 'grade_release' && !settings.sendOnGradeRelease) {
    return { success: false, emailId: '' };
  }
  if (type === 'progress' && !settings.sendProgressUpdates) {
    return { success: false, emailId: '' };
  }

  // Simulate email sending delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In production, this would call Microsoft Graph API or email service
  // For demo, we just log and save the record
  const emailId = crypto.randomUUID();
  const sentEmail: SentEmail = {
    id: emailId,
    to: notification.to,
    toName: notification.toName,
    subject: notification.subject,
    sentAt: new Date(),
    status: 'sent',
    type,
  };

  saveSentEmail(sentEmail);

  // Log for demo purposes
  console.log('📧 Email sent:', {
    to: notification.to,
    subject: notification.subject,
    type,
  });

  return { success: true, emailId };
};

// Send submission notification email
export const sendSubmissionNotification = async (
  studentEmail: string,
  studentName: string,
  examTitle: string,
  score: number,
  totalPossible: number,
  passingScore: number
): Promise<boolean> => {
  const settings = getEmailSettings();
  const percentage = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;
  const passed = percentage >= passingScore;

  const email = generateSubmissionEmail(
    studentName,
    examTitle,
    score,
    totalPossible,
    percentage,
    passed,
    settings.includeDetailedScores
  );

  email.to = studentEmail;

  const result = await sendEmail(email, 'submission');
  return result.success;
};

// Send grade release notification email
export const sendGradeReleaseNotification = async (
  studentEmail: string,
  studentName: string,
  examTitle: string,
  score: number,
  totalPossible: number,
  passingScore: number,
  feedback?: string
): Promise<boolean> => {
  const settings = getEmailSettings();
  const percentage = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;
  const passed = percentage >= passingScore;

  const email = generateGradeReleaseEmail(
    studentName,
    examTitle,
    score,
    totalPossible,
    percentage,
    passed,
    feedback,
    settings.includeDetailedScores
  );

  email.to = studentEmail;

  const result = await sendEmail(email, 'grade_release');
  return result.success;
};
