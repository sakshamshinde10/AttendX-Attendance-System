import React, { createContext, useState, ReactNode } from 'react';

interface ActiveSessionData {
  id: string;
  subject: any;
  class?: any;
  bleUUID: string;
  qrToken: string;
  qrExpiresAt?: number;
  presentCount: number;
  startTime: string;
}

interface AttendanceContextType {
  activeSession: ActiveSessionData | null;
  setActiveSession: (session: ActiveSessionData | null) => void;
  livePresentCount: number;
  setLivePresentCount: React.Dispatch<React.SetStateAction<number>>;
  qrToken: string;
  setQrToken: (token: string) => void;
}

export const AttendanceContext = createContext<AttendanceContextType>({
  activeSession: null,
  setActiveSession: () => {},
  livePresentCount: 0,
  setLivePresentCount: () => {},
  qrToken: '',
  setQrToken: () => {},
});

export const AttendanceProvider = ({ children }: { children: ReactNode }) => {
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);
  const [livePresentCount, setLivePresentCount] = useState<number>(0);
  const [qrToken, setQrToken] = useState<string>('');

  return (
    <AttendanceContext.Provider
      value={{
        activeSession,
        setActiveSession,
        livePresentCount,
        setLivePresentCount,
        qrToken,
        setQrToken,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};
