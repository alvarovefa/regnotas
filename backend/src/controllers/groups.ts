import { Response, NextFunction } from 'express';
import { groupService } from '../services/groupService';
import { AuthenticatedRequest } from '../types';

export const createGroup = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const { nombre, curso_id, estudiante_ids } = req.body;

    const grupoId = await groupService.createGroup(nombre, Number(curso_id), user.id, estudiante_ids);
    res.json({ message: 'Grupo creado exitosamente', grupo_id: grupoId });
  } catch (error) {
    next(error);
  }
};

export const getCourseGroups = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { cursoId } = req.params;
    const result = await groupService.getCourseGroups(Number(cursoId));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const updateGroup = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, estudiante_ids } = req.body;

    await groupService.updateGroup(Number(id), nombre, estudiante_ids);
    res.json({ message: 'Grupo actualizado correctamente' });
  } catch (error) {
    next(error);
  }
};

export const deleteGroup = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await groupService.deleteGroup(Number(id));
    res.json({ message: 'Grupo eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};

export const getMyGroups = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const result = await groupService.getMyGroups(user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
