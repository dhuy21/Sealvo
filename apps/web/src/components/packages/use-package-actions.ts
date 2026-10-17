import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import {
  useCreatePackage,
  useUpdatePackage,
  useDeletePackage,
  useTogglePackage,
  useCopyPackage,
} from '@/hooks/use-packages';
import type { Package } from '@/hooks/use-packages';
import { getApiErrorMessage } from '@/lib/api-error';

type PackageFormData = { package_name: string; package_description: string; mode: string };

/** Package mutations of the packages page with their toasts, and the create/edit/delete modal state. */
export function usePackageActions() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editPkg, setEditPkg] = useState<Package | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const createPkg = useCreatePackage();
  const updatePkg = useUpdatePackage();
  const deletePkg = useDeletePackage();
  const togglePkg = useTogglePackage();
  const copyPkg = useCopyPackage();

  const openCreate = useCallback(() => {
    setEditPkg(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((pkg: Package) => {
    setEditPkg(pkg);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditPkg(null);
  }, []);

  const saveModal = useCallback(
    (data: PackageFormData) => {
      if (editPkg) {
        updatePkg.mutate(
          {
            id: editPkg.package_id,
            dto: {
              package_name: data.package_name,
              package_description: data.package_description,
              mode: data.mode as Package['mode'],
            },
          },
          {
            onSuccess: () => {
              toast.success('Package modifié avec succès');
              setModalOpen(false);
              setEditPkg(null);
            },
            onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
          },
        );
      } else {
        createPkg.mutate(
          {
            package_name: data.package_name,
            package_description: data.package_description,
            mode: data.mode as Package['mode'],
          },
          {
            onSuccess: () => {
              toast.success('Package créé avec succès');
              setModalOpen(false);
            },
            onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
          },
        );
      }
    },
    [editPkg, createPkg, updatePkg],
  );

  const cancelDelete = useCallback(() => setDeleteId(null), []);

  const confirmDelete = useCallback(() => {
    if (deleteId === null) return;
    deletePkg.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Package supprimé avec succès');
        setDeleteId(null);
      },
      onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
    });
  }, [deleteId, deletePkg]);

  const toggle = useCallback(
    (id: number) => {
      togglePkg.mutate(id, {
        onSuccess: (data) => {
          toast.success(data.isActive ? 'Package activé' : 'Package désactivé');
        },
        onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
      });
    },
    [togglePkg],
  );

  const copy = useCallback(
    (id: number) => {
      copyPkg.mutate(id, {
        onSuccess: () => toast.success('Package copié avec succès'),
        onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
      });
    },
    [copyPkg],
  );

  return {
    modalOpen,
    editPkg,
    openCreate,
    openEdit,
    closeModal,
    saveModal,
    saving: createPkg.isPending || updatePkg.isPending,
    deleteId,
    askDelete: setDeleteId,
    cancelDelete,
    confirmDelete,
    deleting: deletePkg.isPending,
    toggle,
    copy,
  };
}
