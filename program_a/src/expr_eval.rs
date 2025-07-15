use crate::{arithmetic, parser};


/// Take a string math expression and evaluate it left to right.
/// 
/// The only valid operations are
///     - addition / subtraction
///     - multiplication / division
///     - exponentiation
///     - modulus
///     - parenthesis
/// 
/// Only integers are allowed in the expression
/// 
/// example: "1 + (3 * 3) / 2" = 5  
pub fn evaluate_expression(
    expr: &str
) -> Result<i32, &'static str> {
    // Remove whitespace
    let expr: String = expr.chars().filter(|c| c.is_whitespace() == false).collect();
    let tokens = tokenize_expr(&expr)?;
    Ok(eval_tokens(&tokens, 0)?.0)
}

#[derive(PartialEq, Eq)]
enum Token {
    Number(i32),
    Operator(char),
    Lparen,
    Rparen

}

fn tokenize_expr(
    mut expr: &str
) -> Result<Vec<Token>, &'static str> {
    let mut tokens = vec![];
    loop {
        if expr.is_empty() { break }

        let (token, rem_expr) = parse_next_token(expr)?;
        tokens.push(token);
        expr = rem_expr;

    }
    
    return Ok(tokens);
}

/// Parse out the next token in the expression. The expression must not contain whitespace
/// 
/// Can be either a parenthesis, number, or operation
/// 
/// Returns the token, and a slice containing the rest of the expression
fn parse_next_token(
    expr: &str
) -> Result<(Token, &str), &'static str> {
    let first = expr.chars().next().ok_or("Error parsing expression: Empty expr")?;
    match first {
        '0'..='9' => {
            let num = parser::extract_first_number(expr).ok_or("Error parsing expression: Integer parse error")?;
            Ok((
                Token::Number(num),
                expr.trim_start_matches(|c: char| c.is_ascii_digit())
            ))
        },
        '+' | '-' | '*' | '/' | '^' | '%' => {
            Ok((
                Token::Operator(first),
                remove_n_chars(1, expr)
            ))
        },
        '(' => Ok((Token::Lparen, remove_n_chars(1, expr))),
        ')' => Ok((Token::Rparen, remove_n_chars(1, expr))),
        _ => Err("Error parsing expression: Invalid token")
    }
}

/// Removes the first n characters from the beginning of a string slice
fn remove_n_chars(n: usize, s: &str) -> &str {
    // ERROR!
    // Invalid if n is not on a unicode character boundary
    // This is fine for ascii tho
    // See the valid unicode version below
    &s[n..]

    /*
    s.char_indices()
        .nth(n)
        .map(|(idx, _)| &s[idx..])
        .unwrap_or("")
    */
}


fn eval_tokens(tokens: &[Token], mut i: usize) -> Result<(i32, usize), &'static str> {
    // Doesnt really matter as long as result is idempotent for current_op
    let mut result = 0;
    let mut current_op = '+';

    while i < tokens.len() {
        match &tokens[i] {
            Token::Number(n) => {
                result = apply_operator(result, *n, current_op)?;
                i += 1;
            }
            Token::Operator(op) => {
                current_op = *op;
                i += 1;
            }
            Token::Lparen => {
                let (inner_result, next_i) = eval_tokens(tokens, i + 1)?;
                result = apply_operator(result, inner_result, current_op)?;
                i = next_i;
            }
            Token::Rparen => {
                return Ok((result, i + 1));
            }
        }
    }

    Ok((result, i))
}

fn apply_operator(lhs: i32, rhs: i32, op: char) -> Result<i32, &'static str> {
    match op {
        '+' => Ok(arithmetic::add(lhs, rhs)),
        '-' => Ok(arithmetic::subtract(lhs, rhs)),
        '*' => Ok(arithmetic::multiply(lhs, rhs)),
        '/' => arithmetic::divide(lhs, rhs).ok_or("Divide by zero error"),
        '^' => Ok(arithmetic::power(lhs, u32::try_from(rhs).map_err(|_| "Power RHS must be positive")?)),
        '%' => arithmetic::modulo(lhs, rhs).ok_or("Modulus RHS must not be zero"),
        _ => return Err("Unexpected operator")
    }
}