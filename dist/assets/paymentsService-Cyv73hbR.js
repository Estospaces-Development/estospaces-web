import{d as r,a1 as e,v as c}from"./index-C1leTaMY.js";/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]],y=r("receipt",i),n=()=>c("payment"),s=t=>({success:!0,data:t});async function p(t={}){const a=await e(`${n()}/api/v1/payments`,t);return s(Array.isArray(a)?a:[])}async function u(t={}){const a=await e(`${n()}/api/v1/manager/payments`,t);return s(Array.isArray(a)?a:[])}async function v(t={}){const a=await e(`${n()}/api/v1/invoices`,t);return s(Array.isArray(a)?a:[])}async function g(t={}){const a=await e(`${n()}/api/v1/manager/invoices`,t);return s(Array.isArray(a)?a:[])}export{y as R,g as a,p as b,v as c,u as g};
//# sourceMappingURL=paymentsService-Cyv73hbR.js.map
