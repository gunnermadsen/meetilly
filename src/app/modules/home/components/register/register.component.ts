import { Component, OnInit } from '@angular/core'
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms'
import { Store } from '@ngrx/store'

import { AppState } from 'src/app/reducers'
import { InvalidCharacterValidator } from 'src/app/shared/validators/invalid-characters.validator'
import { PasswordStrengthValidator } from 'src/app/shared/validators/password-strength.validator'
import { PasswordMatchValidator } from 'src/app/shared/validators/password-match.validator'
import { registerUserRequested } from 'src/app/core/authentication/store/actions/authentication.actions'

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.less']
})
export class RegisterComponent implements OnInit {
  public registerFormGroup: FormGroup
  public register: boolean = false
  public loading: boolean = false
  public submitted: boolean = false

  public get f() {
    return this.registerFormGroup.value
  }
  public get c() {
    return this.registerFormGroup.controls
  }

  constructor(private formBuilder: FormBuilder, private store: Store<AppState>) { }

  ngOnInit() {
    this.registerFormGroup = this.formBuilder.group({
      Email: [
        'gunner.madsen@outlook.com',
        Validators.compose([
          Validators.required,
          Validators.pattern('[a-zA-Z0-9.-_]{1,}@[a-zA-Z.-]{2,}[.]{1}[a-zA-Z]{2,}'),
          InvalidCharacterValidator
        ])
      ],
      UserName: [
        '',
        Validators.compose([
          Validators.required,
          InvalidCharacterValidator
        ])
      ],
      Password: [
        'Megatron1!',
        Validators.compose([
          Validators.required,
          InvalidCharacterValidator
        ])
      ],
      RepeatPassword: [
        'Megatron1!',
        Validators.compose([
          Validators.required,
          InvalidCharacterValidator,
          PasswordStrengthValidator
        ])
      ]
    }, { validators: PasswordMatchValidator })
  }

  public onSubmit() {
    this.submitted = true

    if (this.registerFormGroup.invalid) {
      return
    }

    // if (this.c.Passsword != this.c.RepeatPassword) {
    //   this.c.RepeatPassword.setErrors({ mustMatch: true })
    //   return
    // }

    const user = {
      Email: this.f.Email,
      UserName: this.f.UserName,
      Password: this.f.Password,
    }
    this.store.dispatch(registerUserRequested({ user: user }))
  }

  public getErrorMessage(control: string, error: string): string {
    let message: string
    switch (error) {
      case 'required': {
        message = `${control} is required`
        break
      }
      case 'pattern': {
        message = 'you are entering an invalid email address'
        break
      }
      case 'invalidCharacters': {
        message = '<>^*?+=[]{}"\'|\/= are invalid characters'
        break
      }
      case 'passwordStrength': {
        message = 'Please enter a stronger password'
        break
      }
      case 'mustMatch': {
        message = 'Passwords do not match'
        break
      }
    }
    return this.registerFormGroup.controls[control].hasError(error) ? message : ''
  }
}
