import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createSchool,
  createSchoolGradeShift,
  deleteSchool,
  deleteSchoolGradeShift,
  fetchGrades,
  fetchSchoolGradeShifts,
  fetchSchools,
  fetchShifts,
  Grade,
  School,
  SchoolGradeShift,
  Shift
} from "../services/api";
import { useAuth } from "../state/AuthContext";

export function Schools() {
  const { token } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [groups, setGroups] = useState<SchoolGradeShift[]>([]);
  const [name, setName] = useState("");
  const [locality, setLocality] = useState("");
  const [address, setAddress] = useState("");
  const [schoolGradeId, setSchoolGradeId] = useState("");
  const [schoolShiftId, setSchoolShiftId] = useState("");
  const [groupSchoolId, setGroupSchoolId] = useState("");
  const [groupGradeId, setGroupGradeId] = useState("");
  const [groupShiftId, setGroupShiftId] = useState("");
  const [route, setRoute] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGroupSaving, setIsGroupSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [schoolData, gradeData, shiftData, groupData] = await Promise.all([
          fetchSchools(token),
          fetchGrades(token),
          fetchShifts(token),
          fetchSchoolGradeShifts(token)
        ]);
        setSchools(schoolData);
        setGrades(gradeData);
        setShifts(shiftData);
        setGroups(groupData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar las escuelas.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError("No hay sesión activa.");
      return;
    }
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!schoolGradeId || !schoolShiftId) {
      setError("Seleccioná grado y turno.");
      return;
    }

    setIsSaving(true);
    try {
      const newSchool = await createSchool(token, {
        name: name.trim(),
        locality: locality.trim() || null,
        address: address.trim() || null
      });
      const newGroup = await createSchoolGradeShift(token, {
        school_id: newSchool.id,
        grade_id: Number(schoolGradeId),
        shift_id: Number(schoolShiftId),
        route: null,
        contact_name: null,
        contact_phone: null,
        contact_email: null
      });
      setSchools((prev) => [...prev, newSchool]);
      setGroups((prev) => [...prev, newGroup]);
      setName("");
      setLocality("");
      setAddress("");
      setSchoolGradeId("");
      setSchoolShiftId("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la escuela.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) {
      setError("No hay sesión activa.");
      return;
    }
    if (!window.confirm("¿Querés eliminar esta escuela?")) {
      return;
    }

    try {
      await deleteSchool(token, id);
      setSchools((prev) => prev.filter((school) => school.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la escuela.");
    }
  };

  const handleGroupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError("No hay sesión activa.");
      return;
    }
    if (!groupSchoolId || !groupGradeId || !groupShiftId) {
      setError("Seleccioná escuela, grado y turno.");
      return;
    }

    setIsGroupSaving(true);
    try {
      const newGroup = await createSchoolGradeShift(token, {
        school_id: Number(groupSchoolId),
        grade_id: Number(groupGradeId),
        shift_id: Number(groupShiftId),
        route: route.trim() || null,
        contact_name: contactName.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null
      });
      setGroups((prev) => [...prev, newGroup]);
      setGroupSchoolId("");
      setGroupGradeId("");
      setGroupShiftId("");
      setRoute("");
      setContactName("");
      setContactPhone("");
      setContactEmail("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el grupo.");
    } finally {
      setIsGroupSaving(false);
    }
  };

  const handleGroupDelete = async (id: number) => {
    if (!token) {
      setError("No hay sesión activa.");
      return;
    }
    if (!window.confirm("¿Querés eliminar este grupo?")) {
      return;
    }

    try {
      await deleteSchoolGradeShift(token, id);
      setGroups((prev) => prev.filter((group) => group.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el grupo.");
    }
  };

  const schoolById = useMemo(
    () => new Map(schools.map((school) => [school.id, school])),
    [schools]
  );
  const gradeById = useMemo(
    () => new Map(grades.map((grade) => [grade.id, grade])),
    [grades]
  );
  const shiftById = useMemo(
    () => new Map(shifts.map((shift) => [shift.id, shift])),
    [shifts]
  );

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Escuelas</h1>
          <p>Gestión de instituciones vinculadas a los viajes.</p>
        </div>
      </header>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="field">
            <span>Nombre</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span>Grado</span>
            <select
              value={schoolGradeId}
              onChange={(event) => setSchoolGradeId(event.target.value)}
            >
              <option value="">Seleccionar</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Turno</span>
            <select
              value={schoolShiftId}
              onChange={(event) => setSchoolShiftId(event.target.value)}
            >
              <option value="">Seleccionar</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Localidad</span>
            <input value={locality} onChange={(event) => setLocality(event.target.value)} />
          </label>
          <label className="field">
            <span>Dirección</span>
            <input value={address} onChange={(event) => setAddress(event.target.value)} />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar escuela"}
          </button>
        </div>
      </form>

      <form className="card form-grid" onSubmit={handleGroupSubmit}>
        <div className="form-row">
          <label className="field">
            <span>Escuela</span>
            <select value={groupSchoolId} onChange={(event) => setGroupSchoolId(event.target.value)}>
              <option value="">Seleccionar</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Grado</span>
            <select value={groupGradeId} onChange={(event) => setGroupGradeId(event.target.value)}>
              <option value="">Seleccionar</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Turno</span>
            <select value={groupShiftId} onChange={(event) => setGroupShiftId(event.target.value)}>
              <option value="">Seleccionar</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label className="field">
            <span>Ruta / Grupo-salida</span>
            <input value={route} onChange={(event) => setRoute(event.target.value)} />
          </label>
          <label className="field">
            <span>Nombre de contacto</span>
            <input value={contactName} onChange={(event) => setContactName(event.target.value)} />
          </label>
          <label className="field">
            <span>Teléfono de contacto</span>
            <input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
          </label>
          <label className="field">
            <span>Email de contacto</span>
            <input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn" disabled={isGroupSaving}>
            {isGroupSaving ? "Guardando..." : "Guardar grupo-salida"}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="placeholder-table">
          <div className="table-row header">
            <span>Nombre</span>
            <span>Localidad</span>
            <span>Acciones</span>
          </div>
          {isLoading ? (
            <div className="table-row">
              <span>Cargando...</span>
              <span>-</span>
              <span />
            </div>
          ) : schools.length === 0 ? (
            <div className="table-row">
              <span>Sin escuelas</span>
              <span>Agregá la primera escuela.</span>
              <span />
            </div>
          ) : (
            schools.map((school) => (
              <div key={school.id} className="table-row">
                <span>{school.name}</span>
                <span>{school.locality ?? "-"}</span>
                <span>
                  <button
                    type="button"
                    className="link"
                    onClick={() => handleDelete(school.id)}
                  >
                    Eliminar
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="placeholder-table">
          <div className="table-row header">
            <span>Grupo-salida</span>
            <span>Contacto</span>
            <span>Acciones</span>
          </div>
          {isLoading ? (
            <div className="table-row">
              <span>Cargando...</span>
              <span>-</span>
              <span />
            </div>
          ) : groups.length === 0 ? (
            <div className="table-row">
              <span>Sin grupos</span>
              <span>Agregá el primero.</span>
              <span />
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="table-row">
                <span>
                  {schoolById.get(group.school_id)?.name ?? "Escuela"} -{" "}
                  {gradeById.get(group.grade_id)?.name ?? "Grado"} -{" "}
                  {shiftById.get(group.shift_id)?.name ?? "Turno"}
                </span>
                <span>{group.contact_phone ?? "-"}</span>
                <span>
                  <button type="button" className="link" onClick={() => handleGroupDelete(group.id)}>
                    Eliminar
                  </button>
                  <button
                    type="button"
                    className="link"
                    onClick={() =>
                      window.location.assign(`/budgets?group=${group.id}`)
                    }
                  >
                    Ver presupuesto
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
