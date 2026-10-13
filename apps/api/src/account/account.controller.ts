import { Body, Controller, Get, Patch, Post } from '@nestjs/common'
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
  constructor(private readonly accountService: AccountService) {}

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
