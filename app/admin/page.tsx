import type {Metadata} from "next";
import AdminPanel from "./panel";
import "./admin.css";
export const metadata:Metadata={title:"Panel zamówień — Czytaki",robots:{index:false,follow:false}};
export default function AdminPage(){return <AdminPanel/>;}
