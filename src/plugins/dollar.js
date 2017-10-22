import type Parser from "../parser";
import * as N from "../types";
import { types as tt } from "../tokenizer/types";

export default (superClass: Class<Parser>): Class<Parser> =>
  class extends superClass {
    parseExprAtom(refShorthandDefaultPos?: ?Pos): N.Expression {
      if (this.state.type === tt.dollarL) {
        
        return this.parseParenAndDistinguishExpression(false);
      }

      return super.parseExprAtom(refShorthandDefaultPos);
    }
  };
