import { AbstractControl, ValidationErrors, FormGroup, ValidatorFn } from '@angular/forms';

export const PasswordMatchValidator: ValidatorFn = (form: FormGroup): ValidationErrors | any => {

    const passwordCtrl = form.get('Password');
    const repeatPasswordCtrl = form.get('RepeatPassword');

    if (passwordCtrl.errors && !repeatPasswordCtrl.errors.mustMatch) {
        return;
    }

    if (passwordCtrl.value !== repeatPasswordCtrl.value) {
        repeatPasswordCtrl.setErrors({ mustMatch: true });
    } else {
        repeatPasswordCtrl.setErrors(null);
    }
}