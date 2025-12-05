import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { Button } from '@shared/ui';
import { useUploadVersion } from '../../hooks/useDeliverableMutations';
import type { DeliverableUploadProps } from './DeliverableUpload.types';
import styles from './DeliverableUpload.module.css';

const DEFAULT_MAX_SIZE_MB = 100;
const DEFAULT_ACCEPTED_TYPES = [
  'image/*',
  'video/*',
  'application/pdf',
  'application/zip',
  'application/x-rar-compressed',
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function DeliverableUpload({
  deliverableId,
  onSuccess,
  onError,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
}: DeliverableUploadProps) {
  const uploadVersion = useUploadVersion();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`;
      }
      return null;
    },
    [maxSizeMB]
  );

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setSelectedFile(file);

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    },
    [validateFile]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setComment('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadVersion.mutateAsync({
        deliverableId,
        file: selectedFile,
        ...(comment ? { comment } : {}),
      });
      handleRemoveFile();
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao fazer upload');
      setError(error.message);
      onError?.(error);
    }
  };

  return (
    <div className={styles.container}>
      {error && <div className={styles.error}>{error}</div>}

      {!selectedFile ? (
        <div
          className={`${styles.dropzone} ${isDragging ? styles.dropzoneDragging : ''} ${
            uploadVersion.isPending ? styles.dropzoneDisabled : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg
            className={`${styles.icon} ${isDragging ? styles.iconDragging : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div className={styles.text}>
            <p className={styles.title}>
              Arraste e solte ou <span className={styles.highlight}>clique para selecionar</span>
            </p>
            <p className={styles.subtitle}>
              Tamanho máximo: {maxSizeMB}MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className={styles.input}
            accept={acceptedTypes.join(',')}
            onChange={handleInputChange}
            disabled={uploadVersion.isPending}
          />
        </div>
      ) : (
        <>
          <div className={styles.preview}>
            {previewUrl ? (
              <img src={previewUrl} alt={selectedFile.name} className={styles.previewImage} />
            ) : (
              <div className={styles.previewIcon}>
                <svg className={styles.previewIconSvg} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className={styles.previewInfo}>
              <p className={styles.previewName}>{selectedFile.name}</p>
              <p className={styles.previewSize}>{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              className={styles.previewRemove}
              onClick={handleRemoveFile}
              disabled={uploadVersion.isPending}
              aria-label="Remover arquivo"
            >
              <svg className={styles.previewRemoveIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className={styles.commentField}>
            <label className={styles.commentLabel}>Comentário (opcional)</label>
            <textarea
              className={styles.commentInput}
              placeholder="Descreva as alterações nesta versão..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={uploadVersion.isPending}
            />
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" onClick={handleRemoveFile} disabled={uploadVersion.isPending}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleUpload} isLoading={uploadVersion.isPending}>
              Fazer Upload
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
