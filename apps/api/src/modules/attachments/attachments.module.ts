import { Module } from '@nestjs/common'
import { StorageModule } from '../../common/storage/storage.module.js'
import { ProjectsModule } from '../projects/projects.module.js'
import { AttachmentsController } from './attachments.controller.js'
import { AttachmentsRepository } from './attachments.repository.js'
import { AttachmentsService } from './attachments.service.js'
import { AttachmentsTrash } from './attachments.trash.js'

// Depende de Proyectos (¿existe y es de la persona?) y de Storage (firmar y confirmar subidas);
// ninguno de los dos depende de él, igual que Sprints con Proyectos y Tareas.
@Module({
  imports: [ProjectsModule, StorageModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentsRepository, AttachmentsTrash],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
