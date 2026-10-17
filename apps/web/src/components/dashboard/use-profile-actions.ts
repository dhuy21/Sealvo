import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import { useTestReminder, useUpdateProfile } from '@/hooks/use-dashboard';
import { getApiErrorMessage } from '@/lib/api-error';

/** Profile mutations of the dashboard, with their toasts and the local user update. */
export function useProfileActions({ onAvatarSaved }: { onAvatarSaved: () => void }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const updateProfile = useUpdateProfile();
  const testReminder = useTestReminder();

  const saveField = useCallback(
    (fieldName: string, rawValue: string, currentPassword?: string) => {
      const newValue = rawValue.trim();
      updateProfile.mutate(
        { [fieldName]: newValue, current_password: currentPassword },
        {
          onSuccess: ({ pendingEmail }) => {
            if (pendingEmail) {
              toast.success(
                `Un email de confirmation a été envoyé à ${pendingEmail}. Cliquez sur le lien qu'il contient pour valider votre nouvelle adresse.`,
                { duration: 8000 },
              );
              return;
            }
            toast.success('Informations modifiées avec succès');
            if (user) {
              setUser({ ...user, [fieldName]: newValue });
            }
          },
          onError: (err) => {
            toast.error(getApiErrorMessage(err, 'Erreur lors de la modification'));
          },
        },
      );
    },
    [updateProfile, user, setUser],
  );

  const saveAvatar = useCallback(
    (ava: number) => {
      updateProfile.mutate(
        { ava },
        {
          onSuccess: () => {
            toast.success('Avatar modifié avec succès');
            onAvatarSaved();
            if (user) {
              setUser({ ...user, ava });
            }
          },
          onError: (err) => {
            toast.error(getApiErrorMessage(err, "Erreur lors de la modification de l'avatar"));
          },
        },
      );
    },
    [updateProfile, user, setUser, onAvatarSaved],
  );

  const sendTestReminder = () => {
    testReminder.mutate(undefined, {
      onSuccess: ({ message }) => toast.success(message),
      onError: (err) => toast.error(getApiErrorMessage(err, "Échec de l'envoi de l'email")),
    });
  };

  return { saveField, saveAvatar, sendTestReminder, saving: updateProfile.isPending };
}
