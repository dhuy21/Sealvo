import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore, type User } from '@/stores/auth.store';
import { useTestReminder, useUpdateProfile } from '@/hooks/use-dashboard';
import { getApiErrorMessage } from '@/lib/api-error';

/** Read when the save completes: two quick saves must not undo each other */
function updateUser(change: Partial<User>) {
  const { user, setUser } = useAuthStore.getState();
  if (user) setUser({ ...user, ...change });
}

/**
 * Profile mutations of the dashboard, with their toasts and the local user update.
 * mutateAsync: TanStack Query runs mutate()'s own callbacks for the latest call only.
 */
export function useProfileActions({ onAvatarSaved }: { onAvatarSaved: () => void }) {
  const updateProfile = useUpdateProfile();
  const testReminder = useTestReminder();

  const saveField = useCallback(
    (fieldName: string, rawValue: string, currentPassword?: string) => {
      const newValue = rawValue.trim();
      updateProfile.mutateAsync({ [fieldName]: newValue, current_password: currentPassword }).then(
        ({ pendingEmail }) => {
          if (pendingEmail) {
            toast.success(
              `Un email de confirmation a été envoyé à ${pendingEmail}. Cliquez sur le lien qu'il contient pour valider votre nouvelle adresse.`,
              { duration: 8000 },
            );
            return;
          }
          toast.success('Informations modifiées avec succès');
          // The email only changes through its confirmation link
          if (fieldName !== 'email') updateUser({ [fieldName]: newValue });
        },
        (err: unknown) => {
          toast.error(getApiErrorMessage(err, 'Erreur lors de la modification'));
        },
      );
    },
    [updateProfile],
  );

  const saveAvatar = useCallback(
    (ava: number) => {
      updateProfile.mutateAsync({ ava }).then(
        () => {
          toast.success('Avatar modifié avec succès');
          onAvatarSaved();
          updateUser({ ava });
        },
        (err: unknown) => {
          toast.error(getApiErrorMessage(err, "Erreur lors de la modification de l'avatar"));
        },
      );
    },
    [updateProfile, onAvatarSaved],
  );

  const sendTestReminder = () => {
    testReminder.mutate(undefined, {
      onSuccess: ({ message }) => toast.success(message),
      onError: (err) => toast.error(getApiErrorMessage(err, "Échec de l'envoi de l'email")),
    });
  };

  return { saveField, saveAvatar, sendTestReminder, saving: updateProfile.isPending };
}
