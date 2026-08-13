import { groupRepository } from '../repositories/groupRepository';
import { Group } from '../types';
import { BadRequestError } from '../errors/AppError';

export class GroupService {
  async createGroup(nombre: string, cursoId: number, creadoPor: number, estudianteIds: number[] = []): Promise<number> {
    if (!nombre || !nombre.trim()) {
      throw new BadRequestError('El nombre del grupo es obligatorio');
    }
    if (!cursoId) {
      throw new BadRequestError('El ID de curso es obligatorio');
    }

    const groupId = await groupRepository.createGroup(nombre, cursoId, creadoPor);

    if (Array.isArray(estudianteIds) && estudianteIds.length > 0) {
      await groupRepository.setGroupMembers(groupId, estudianteIds);
    }

    return groupId;
  }

  async getCourseGroups(courseId: number): Promise<Group[]> {
    if (!courseId) {
      throw new BadRequestError('ID de curso no válido');
    }
    return await groupRepository.findByCourse(courseId);
  }

  async getMyGroups(userId: number): Promise<Group[]> {
    if (!userId) {
      throw new BadRequestError('ID de usuario no válido');
    }
    return await groupRepository.findUserGroups(userId);
  }

  async updateGroup(groupId: number, nombre?: string, estudianteIds?: number[]): Promise<void> {
    if (nombre && nombre.trim()) {
      await groupRepository.updateName(groupId, nombre);
    }

    if (Array.isArray(estudianteIds)) {
      await groupRepository.setGroupMembers(groupId, estudianteIds);
    }
  }

  async deleteGroup(groupId: number): Promise<void> {
    if (!groupId) {
      throw new BadRequestError('ID de grupo no válido');
    }
    await groupRepository.deleteGroup(groupId);
  }
}

export const groupService = new GroupService();
