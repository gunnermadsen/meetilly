import { AbstractControl, ValidationErrors } from "@angular/forms"

export const PasswordStrengthValidator = function (control: AbstractControl): ValidationErrors | null {

  let value: string = control.value || '';

  if (!value) {
    return { passwordStrength: 'Your new password is required'}
  }

  let upperCaseCharacters = /[A-Z]+/g
  if (upperCaseCharacters.test(value) === false) {
    return { passwordStrength: 'At least one upper case character is required' };
  }

  let numberOfCharacters = /^.{8,}$/
  if (numberOfCharacters.test(value) === false) {
      return { passwordStrength: 'A minimum of 8 characters is required'}
  }

  // let lowerCaseCharacters = /[a-z]+/g
  // if (lowerCaseCharacters.test(value) === false) {
  //   return { passwordStrength: 'lower case required' };
  // }


  let numberCharacters = /[0-9]+/g
  if (numberCharacters.test(value) === false) {
    return { passwordStrength: 'At least one number is required' };
  }

  let specialCharacters = /[!@#$%^&()_+\-=\[\]{};:"\\|,.\/?]+/
  if (specialCharacters.test(value) === false) {
    return { passwordStrength: 'At least one special character is required' };
  }
  return null;
}