import type Parser from "../parser";
import * as N from "../types";
import { types as tt } from "../tokenizer/types";
import type { Pos, Position } from "../util/location";

export default (superClass: Class<Parser>): Class<Parser> =>
  class extends superClass {
    parseSubscript(
      base: N.Expression,
      startPos: number,
      startLoc: Position,
      noCalls: ?boolean,
      state: { stop: boolean },
    ): N.Expression {
      if ((this.match(tt.parenL) || this.match(tt.dollarL)) && !noCalls) {
        const isDollar = this.match(tt.dollarL);
        const possibleAsync = this.atPossibleAsync(base);
        this.next();

        const node = this.startNodeAt(startPos, startLoc);
        node.callee = base;

        // TODO: Clean up/merge this into `this.state` or a class like acorn's
        // `DestructuringErrors` alongside refShorthandDefaultPos and
        // refNeedsArrowPos.
        const refTrailingCommaPos: Pos = { start: -1 };

        if (isDollar) {
          node.arguments = this.parseCallExpressionArguments(
            tt.semi,
            possibleAsync,
            refTrailingCommaPos,
          );
        } else {
          node.arguments = this.parseCallExpressionArguments(
            tt.parenR,
            possibleAsync,
            refTrailingCommaPos,
          );
        }
        this.finishCallExpression(node);

        if (possibleAsync && this.shouldParseAsyncArrow()) {
          state.stop = true;

          if (refTrailingCommaPos.start > -1) {
            this.raise(
              refTrailingCommaPos.start,
              "A trailing comma is not permitted after the rest element",
            );
          }

          return this.parseAsyncArrowFromCallExpression(
            this.startNodeAt(startPos, startLoc),
            node,
          );
        } else {
          this.toReferencedList(node.arguments);
        }
        return node;
      }

      return super.parseSubscript(base, startPos, startLoc, noCalls, state);
    }

    parseCallExpressionArguments(
      close: TokenType,
      possibleAsyncArrow: boolean,
      refTrailingCommaPos?: Pos,
    ): $ReadOnlyArray<?N.Expression> {
      const elts = [];
      let innerParenStart;
      let first = true;

      const closeOnEol = close === tt.semi;

      while (!this.eat(close) && !(closeOnEol && this.canInsertSemicolon())) {
        if (first) {
          first = false;
        } else {
          this.expect(tt.comma);
          if (this.eat(close)) break;
        }

        // we need to make sure that if this is an async arrow functions,
        // that we don't allow inner parens inside the params
        if (
          (this.match(tt.parenL) || this.match(tt.dollarL)) &&
          !innerParenStart
        ) {
          innerParenStart = this.state.start;
        }

        elts.push(
          this.parseExprListItem(
            false,
            possibleAsyncArrow ? { start: 0 } : undefined,
            possibleAsyncArrow ? { start: 0 } : undefined,
            possibleAsyncArrow ? refTrailingCommaPos : undefined,
          ),
        );
      }
      // we found an async arrow function so let's not allow any inner parens
      if (
        possibleAsyncArrow &&
        innerParenStart &&
        this.shouldParseAsyncArrow()
      ) {
        this.unexpected();
      }

      return elts;
    }
  };
