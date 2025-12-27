import React from "react";
import { createRoot } from "react-dom/client";
import { Root } from "./app";

const elementId = `app-container-${process.env.GESTIONO_APP_ID}`
console.log({elementId})
const element = document.getElementById(elementId)
console.log({element})
element?.classList.add('col-span-full')
if (element) createRoot(element).render(<Root />)