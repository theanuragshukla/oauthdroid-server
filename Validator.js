const checkSpaces = (str, exact = true) => {
  var len = str.replace(/\s/g, "").length;
  return exact ? len === str.length && len !== 0 : len !== 0;
};

const checklen = (min, max, str, strict = true) => {
  if (!checkSpaces(str, strict)) {
    return false;
  } else {
    if (!(str.length <= max && str.length >= min)) {
      return false;
    } else {
      return true;
    }
  }
};

const regex = {
  lowercase: /.*[a-z].*/,
  uppercase: /.*[A-Z].*/,
  number: /.*\d.*/,
  symbol: /.*[^a-zA-Z\d\s:].*/,
};

const validEmail = (str) => {
  const atposition = str.indexOf("@");
  const dotposition = str.lastIndexOf(".");
  const wrongEmail =
    atposition < 1 ||
    dotposition < atposition + 2 ||
    dotposition + 2 >= str.length ||
    str.length <= 5;
  return !wrongEmail;
};

class Validator {
  defaultSchema = {
    firstName: {
      min: 3,
      max: 50,
      required: true,
    },
    lastName: {
      min: 3,
      max: 50,
      required: false,
    },

    email: {
      required: true,
    },
    password: {
      min: 8,
      max: 128,
      required: {
        lowercase: false,
        uppercase: false,
        number: false,
        symbol: false,
      },
    },
  };

  constructor({ schema } = { schema: this.defaultSchema }) {
    this.schema = schema;
  }
  checkName = (obj) => {
      return {
        firstName: checklen(
          this.schema.firstName.min,
          this.schema.firstName.max,
          obj.firstName,
          true
        ),
        lastName: checklen(
          this.schema.lastName.min,
          this.schema.lastName.max,
          obj.lastName,
          true
        ),
      };
  };

  checkEmail = (str) => {
    return checklen(8, 100, str) && validEmail(str);
  };

  checkPass = (str) => {
    return {
      length: checklen(
        this.schema.password.min,
        this.schema.password.max,
        str,
        true
      ),
      lowercase:
        !this.schema.password.required.lowercase || regex.lowercase.test(str),
      symbol: !this.schema.password.required.symbol || regex.symbol.test(str),
      number: !this.schema.password.required.number || regex.number.test(str),
      uppercase:
        !this.schema.password.required.uppercase || regex.uppercase.test(str),
    };
  };

  validate = ({
    signup = true,
    email,
    password,
    fname,
    lname,
    username
  }) => {
    const errors = {};
    errors.username = checklen(3, 16, username, true);
    errors.password = this.checkPass(password);
    if (!signup) return errors;
    errors.fname = checklen(3, 50, fname, true)
    errors.lname = checklen(0, 50, lname, false)
    errors.email = this.checkEmail(email)
    return errors;
  };
}
module.exports = new Validator();