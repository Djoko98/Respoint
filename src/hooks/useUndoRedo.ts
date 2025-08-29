import { useContext } from "react";
import { UndoRedoContext } from "../context/UndoRedoContext";

export const useUndoRedo = () => useContext(UndoRedoContext);
