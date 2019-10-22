import { AbstractControl, ValidationErrors } from "@angular/forms"

export const InvalidCharacterValidator = function (control: AbstractControl): ValidationErrors | null {

  let value: string = control.value || '';

  if (!value) {
    return;
  }

  let specialCharacters = /[<>^*+\-=\[\]{}"'\\|\/?=]+/
  if (specialCharacters.test(value) === true) {
    return { invalidCharacters: 'You are entering invalid characters.' };
  }
  return null;
}