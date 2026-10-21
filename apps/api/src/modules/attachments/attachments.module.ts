import { Module } from '@nestjs/common'
import { StorageModule } from '../../common/storage/storage.module'
import { ProjectsModule } from '../projects/projects.module'
import { AttachmentsController } from './attachments.controller'
import { AttachmentsRepository } from './attachments.repository'
import { AttachmentsService } from './attachments.service'

// Depende de Proyectos (¿existe y es de la persona?) y de Storage (firmar y confirmar subidas);
// ninguno de los dos depende de él, igual que Sprints con Proyectos y Tareas.
@Module({
  imports: [ProjectsModule, StorageModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentsRepository],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
