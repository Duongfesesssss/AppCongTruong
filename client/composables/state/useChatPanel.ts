export type ChatFocus =
  | { scope: 'global' }
  | { scope: 'project'; projectId: string }
  | { scope: 'dm'; dmPartnerId: string };

export const useChatPanel = () => {
  const open = useState('chat-panel-open', () => false);
  const focus = useState<ChatFocus | null>('chat-panel-focus', () => null);

  const openWithFocus = (f: ChatFocus) => {
    focus.value = f;
    open.value = true;
  };

  return { open, focus, openWithFocus };
};
