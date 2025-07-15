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
    return Ok(eval_tokens(&tokens)?.0)
}

#[derive(PartialEq, Eq)]
enum Token {
    Number(i32),
    Operation(char),
    Lparen,
    Rparen

}

pub fn tokenize_expr(
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
pub fn parse_next_token(
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
                Token::Operation(first),
                remove_n_chars(1, expr)
            ))
        },
        '(' => Ok((Token::Lparen, remove_n_chars(1, expr))),
        ')' => Ok((Token::Rparen, remove_n_chars(1, expr))),
        _ => Err("Error parsing expression: Invalid token")
    }
}

/// Removes the first n characters from the beginning of a string slice
pub fn remove_n_chars(n: usize, s: &str) -> &str {
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


pub fn eval_tokens(mut tokens: &[Token]) -> Result<(i32, &[Token]), &'static str> {
    // Using iterators would be a much better way to do this
    // but I'm using indexing to introduce some oob errors
    // Lots of direct indexing in here to produce errors

    // Consume the first token in the expression
    let mut lhs = match tokens[0] {
        Token::Number(num) => {
            tokens = &tokens[1..];
            num
        },
        Token::Lparen => {
            let (result, rem_tokens) = eval_tokens(&tokens[1..])?;
            tokens = rem_tokens;
            result
        },
        Token::Operation(_) | Token::Rparen => return Err("Expression cannot begin with operation or right paren"),
    };

    // Consume the remaining tokens in the eval chain
    loop {
        if tokens.is_empty() { break }

        let op = match tokens[0] {
            Token::Operation(op) => op,
            Token::Rparen => return Ok((lhs, &tokens[1..])),
            Token::Lparen | Token::Number(_) => return Err("Expexted operation or right paren")
        };
        tokens = &tokens[1..];

        let rhs = match tokens[0] {
            Token::Number(num) => {
                tokens = &tokens[1..];
                num
            },
            Token::Lparen => {
                let (result, rem_tokens) = eval_tokens(&tokens[1..])?;
                tokens = rem_tokens;
                result
            },
            Token::Operation(_) | Token::Rparen => return Err("RHS of operator cannot be another operator or right paren")
        };

        lhs = match op {
            '+' => arithmetic::add(lhs, rhs),
            '-' => arithmetic::subtract(lhs, rhs),
            '*' => arithmetic::multiply(lhs, rhs),
            '/' => arithmetic::divide(lhs, rhs).ok_or("Divide by zero error")?,
            '^' => arithmetic::power(lhs, u32::try_from(rhs).map_err(|_| "Power RHS must be positive")?),
            '%' => arithmetic::modulo(lhs, rhs).ok_or("Modulus RHS must not be zero")?,
            _ => return Err("Unexpected operator")
        }
    }
    return Ok((lhs, &[]))
}