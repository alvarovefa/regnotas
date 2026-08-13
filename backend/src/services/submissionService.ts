import path from 'path';
import fs from 'fs';
import { submissionRepository } from '../repositories/submissionRepository';
import { groupRepository } from '../repositories/groupRepository';
import { Submission, SubmissionType, UserRole } from '../types';
import { BadRequestError, NotFoundError, ForbiddenError } from '../errors/AppError';
import { ENV } from '../config/env';

export class SubmissionService {
  async processUpload(
    userId: number,
    file: Express.Multer.File,
    tipoEntregaStr?: string,
    grupoIdStr?: string,
    asignaturaIdStr?: string
  ): Promise<number> {
    if (!file) {
      throw new BadRequestError('No se subió ningún archivo');
    }

    if (!asignaturaIdStr) {
      throw new BadRequestError('Falta especificar la asignatura (asignatura_id)');
    }

    const tipo: SubmissionType = tipoEntregaStr === 'evaluacion' ? 'evaluacion' : 'tarea';
    const grupoId = grupoIdStr ? parseInt(grupoIdStr, 10) : null;
    const asignaturaId = parseInt(asignaturaIdStr, 10);

    if (grupoId) {
      const isMember = await groupRepository.isUserInGroup(userId, grupoId);
      if (!isMember) {
        throw new ForbiddenError('No perteneces a este grupo de trabajo');
      }
    }

    const extension = path.extname(file.originalname);
    const relativePath = path.join('uploads', file.filename);

    return await submissionRepository.create(
      userId,
      grupoId,
      asignaturaId,
      file.originalname,
      file.filename,
      relativePath,
      file.size,
      extension,
      tipo
    );
  }

  async getUserSubmissions(userId: number): Promise<Submission[]> {
    return await submissionRepository.findUserSubmissions(userId);
  }

  async getFileForDownload(submissionId: number, userId: number, userRole: UserRole): Promise<{ absolutePath: string; originalName: string }> {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      throw new NotFoundError('Archivo no encontrado');
    }

    const isAuthorizedRole = ['profesor', 'directivo', 'administrador'].includes(userRole);
    if (!isAuthorizedRole) {
      const isAuthorizedUser = await submissionRepository.isUserAuthorizedToDownload(submissionId, userId);
      if (!isAuthorizedUser) {
        throw new ForbiddenError('Acceso no autorizado al archivo');
      }
    }

    // Prevención estricta de Path Traversal
    const safeFilename = path.basename(submission.nombre_almacenado);
    const absolutePath = path.join(ENV.STORAGE_UPLOADS_DIR, safeFilename);

    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundError('El archivo físico no existe en el servidor');
    }

    return { absolutePath, originalName: submission.nombre_original };
  }
}

export const submissionService = new SubmissionService();
