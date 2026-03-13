const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:10871';

export interface CommandResponse {
  success: boolean;
  message: string;
}

export const inboxApi = {
  /** Send message to RoboFang inbox (schedule phrase or command). No reply channel. */
  send: async (message: string): Promise<CommandResponse> => {
    const res = await fetch(`${BRIDGE_URL}/hooks/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim(), reply_to: null }),
    });
    return res.json();
  },
};

/** Prerecorded messages for testing and demos. */
export const PRESET_MESSAGES: { label: string; message: string }[] = [
  { label: 'Dawn patrol 7am daily', message: 'dawn patrol 7am daily' },
  { label: 'Bug bash Friday 2pm weekly', message: 'bug bash Friday 2pm weekly' },
  { label: 'List routines', message: 'What routines are scheduled? List them.' },
  { label: 'Fleet status', message: 'What is the fleet status? Which connectors are online?' },
  { label: 'Schedule summary', message: 'Summarize my schedule and next run times.' },
];
