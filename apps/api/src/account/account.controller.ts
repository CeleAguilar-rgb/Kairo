import { Body, Controller, Get, Inject, Patch, Post } from '@nestjs/common'
import {
  type CompleteOnboardingInput,
  completeOnboardingSchema,
  type UpdateProfileInput,
  updateProfileSchema,
  type UpdateSectionsInput,
  updateSectionsSchema,
} from '@kairo/shared'
import { CurrentUser } from '../auth/current-user.decorator'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { AccountService } from './account.service'

@Controller('me')
export class AccountController {
  // @Inject() explícito: tsx/esbuild no siempre emite la metadata de tipos
  // que Nest usa para inyectar por tipo solo (docs/history/current.md,
  // Bloqueos; mismo caso que Reflector en auth/jwt.guard.ts).
  constructor(@Inject(AccountService) private readonly accountService: AccountService) {}

  @Get()
  getMe(@CurrentUser() userId: string) {
    return this.accountService.getMe(userId)
  }

  @Patch()
  updateProfile(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.accountService.updateProfile(userId, body)
  }

  @Post('onboarding')
  completeOnboarding(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(completeOnboardingSchema))
    body: CompleteOnboardingInput,
  ) {
    return this.accountService.completeOnboarding(userId, body)
  }

  @Patch('sections')
  updateSections(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(updateSectionsSchema))
    body: UpdateSectionsInput,
  ) {
    return this.accountService.updateSections(userId, body)
  }
}
