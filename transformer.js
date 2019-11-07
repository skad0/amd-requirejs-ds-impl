"use strict";
const moduleRootFolder = "document-services-implementation";
const mappings = {
  documentServices: "src"
};
const mappedPaths = Object.keys(mappings);

const resolvePath = (path, filePath) => {
  const pathToResolve = mappedPaths.find(p => path.includes(p));

  if (!pathToResolve) {
    return path;
  }

  const regex = `^(.*?)${moduleRootFolder}(.*?)$`;
  const deepSize =
    filePath.replace(new RegExp(regex), "$2").split("/").length - 2; // 2 = 1 (split extra) + 1 (path extra)
  const symbol = "../";

  return path.replace(
    pathToResolve,
    `${symbol.repeat(deepSize)}${mappings[pathToResolve]}`
  );
};

const buildRequire = (j, v, r, filePath) => {
  let code = "";
  if (v && v.type === "Identifier" && v.name.length) {
    code += `const ${v.name}`;
  }
  if (r && r.type === "Literal" && r.value.length) {
    if (code.length) {
      code += " = ";
    }
    code += `require('${resolvePath(r.value, filePath)}')`;
  }
  code += "$";
  if (code === "$") {
    code = "";
  }
  return code.slice(0, -1);
};

const transformer = function(file, api) {
  const j = api.jscodeshift;
  return j(file.source)
    .find(j.ExpressionStatement)
    .filter(
      path =>
        path.parentPath.node.type === "Program" &&
        path.node.expression.type === "CallExpression" &&
        path.node.expression.callee.type === "Identifier" &&
        path.node.expression.callee.name === "define" &&
        path.node.expression.arguments.length === 2 &&
        path.node.expression.arguments[0].type === "ArrayExpression" &&
        ["FunctionExpression", "ArrowFunctionExpression"].indexOf(
          path.node.expression.arguments[1].type
        ) >= 0
    )
    .replaceWith(path => {
      const arrayExpression = path.node.expression.arguments[0];
      const functionExpression = path.node.expression.arguments[1];
      const comments = path.node.comments;
      const result = [];
      const statementSize = Math.max(
        functionExpression.params.length,
        arrayExpression.elements.length
      );
      for (let i = 0; i < statementSize; i++) {
        result.push(
          buildRequire(
            j,
            functionExpression.params[i],
            arrayExpression.elements[i],
            file.path
          )
        );
      }
      if (result.length && comments && comments.length) {
        const firstNode = j(result[0]).get().value.program.body[0];
        firstNode.comments = [];
        comments.forEach(comment => {
          let newComment;
          if (comment.type === "CommentLine") {
            newComment = j.commentLine(
              comment.value,
              comment.leading,
              comment.trailing
            );
          } else if (comment.type === "CommentBlock") {
            newComment = j.commentBlock(
              comment.value,
              comment.leading,
              comment.trailing
            );
          }
          if (newComment) {
            firstNode.comments.push(newComment);
          }
        });
        result[0] = firstNode;
      }
      const leading = [];
      let isLeading = true;
      functionExpression.body.body.forEach(item => {
        if (
          isLeading &&
          item.type === "ExpressionStatement" &&
          item.expression.type === "Literal"
        ) {
          leading.push(item);
        } else if (item.type === "ReturnStatement") {
          const returnStatement = j(item)
            .toSource()
            .replace("return ", "module.exports = ");
          isLeading = false;
          result.push(returnStatement);
        } else {
          isLeading = false;
          result.push(item);
        }
      });
      return leading.concat(result);
    })
    .toSource();
};

module.exports = {
  transformer,
  resolvePath
};
