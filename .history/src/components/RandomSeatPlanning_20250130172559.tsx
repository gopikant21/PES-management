import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Maximize2, Trash2, X } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ClassDetail {
  class: string;
  startNum: string;
  endNum: string;
  total: string;
}

interface Group {
  name: string;
  benches: number;
}

interface Student {
  class: string;
  admitNo: number;
}

interface GroupStructure {
  name: string;
  benches: (Student | null)[][];
}

const RandomSeatingPlanner: React.FC = () => {
  const [classes, setClasses] = useState<ClassDetail[]>([
    { class: "", startNum: "", endNum: "", total: "" },
  ]);
  const [groups, setGroups] = useState<Group[]>([{ name: "A", benches: 5 }]);
  const [studentsPerBench, setStudentsPerBench] = useState<number>(3);
  const [seatingPlan, setSeatingPlan] = useState<GroupStructure[]>([]);
  const [error, setError] = useState<string>("");
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const handleDownloadPDF = async (): Promise<void> => {
    const element = document.getElementById("seating-arrangement");

    if (!element) {
      console.error("Element with ID 'seating-arrangement' not found");
      return;
    }

    try {
      // Capture the element using html2canvas
      const canvas = await html2canvas(element, { scale: 2 });

      // Get the canvas dimensions
      const imgWidth = 297; // A4 width in mm (landscape)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF("l", "mm", "a4"); // 'l' is for landscape orientation

      // Ensure the image fits within the page dimensions
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        imgWidth,
        imgHeight > 210 ? 210 : imgHeight // Ensure height fits within A4 landscape
      );

      pdf.save("seating-arrangement.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const addClass = (): void => {
    setClasses([
      ...classes,
      { class: "", startNum: "", endNum: "", total: "" },
    ]);
  };

  const deleteClass = (index: number): void => {
    const newClasses = classes.filter((_, i) => i !== index);
    setClasses(newClasses);
  };

  const addGroup = (): void => {
    const nextGroupName = String.fromCharCode(65 + groups.length);
    setGroups([...groups, { name: nextGroupName, benches: 5 }]);
  };

  const deleteGroup = (index: number): void => {
    const newGroups = groups.filter((_, i) => i !== index);
    newGroups.forEach((group, i) => {
      group.name = String.fromCharCode(65 + i);
    });
    setGroups(newGroups);
  };

  const updateClass = (
    index: number,
    field: keyof ClassDetail,
    value: string
  ): void => {
    const newClasses = [...classes];
    newClasses[index][field] = value;
    if (field === "startNum" || field === "endNum") {
      const start = parseInt(
        field === "startNum" ? value : newClasses[index].startNum
      );
      const end = parseInt(
        field === "endNum" ? value : newClasses[index].endNum
      );
      if (!isNaN(start) && !isNaN(end)) {
        newClasses[index].total = (end - start + 1).toString();
      }
    }
    setClasses(newClasses);
  };

  const updateGroup = (index: number, value: string): void => {
    const newGroups = [...groups];
    const parsedValue = parseInt(value);
    if (!isNaN(parsedValue)) {
      newGroups[index].benches = parsedValue;
      setGroups(newGroups);
    }
  };

  const isValidPlacement = (
    groupIndex: number,
    benchIndex: number,
    seatIndex: number,
    student: Student,
    seatingStructure: GroupStructure[]
  ): boolean => {
    // Check horizontal constraint (same bench)
    const currentBench = seatingStructure[groupIndex].benches[benchIndex];
    if (currentBench.some((s) => s && s.class === student.class)) {
      return false;
    }

    // Check vertical constraint with relaxation (minimum 2 benches gap)
    for (let g = 0; g < seatingStructure.length; g++) {
      const group = seatingStructure[g];
      for (let b = 0; b < group.benches.length; b++) {
        // Skip checking the exact position we're trying to place at
        if (!(g === groupIndex && b === benchIndex)) {
          const studentAtPosition = group.benches[b][seatIndex];
          if (studentAtPosition && studentAtPosition.class === student.class) {
            // If in same group and same column, check if gap is less than 2 benches
            if (g === groupIndex && Math.abs(b - benchIndex) < 3) {
              return false;
            }
          }
        }
      }
    }

    return true;
  };

  const generateSeatingPlan = (): void => {
    setError("");

    // Create array of all students grouped by class
    const studentsByClass: { [key: string]: Student[] } = {};
    classes.forEach((c) => {
      if (c.startNum && c.endNum && c.class) {
        studentsByClass[c.class] = [];
        for (let i = parseInt(c.startNum); i <= parseInt(c.endNum); i++) {
          studentsByClass[c.class].push({
            class: c.class,
            admitNo: i,
          });
        }
      }
    });

    // Calculate total capacity and required seats
    const totalCapacity = groups.reduce(
      (sum, group) => sum + group.benches * studentsPerBench,
      0
    );
    const totalStudents = Object.values(studentsByClass).reduce(
      (sum, students) => sum + students.length,
      0
    );

    if (totalStudents > totalCapacity) {
      setError("Not enough seats for all students");
      return;
    }

    // Initialize seating structure
    const seatingStructure: GroupStructure[] = groups.map((group) => ({
      name: group.name,
      benches: Array(group.benches)
        .fill(null)
        .map(() => Array(studentsPerBench).fill(null)),
    }));

    // Create all available positions
    const allPositions: { group: number; bench: number; seat: number }[] = [];
    for (let g = 0; g < seatingStructure.length; g++) {
      for (let b = 0; b < seatingStructure[g].benches.length; b++) {
        for (let s = 0; s < studentsPerBench; s++) {
          allPositions.push({ group: g, bench: b, seat: s });
        }
      }
    }

    // Distribute students strategically
    const placeStudentsStrategically = (): boolean => {
      // Sort classes by size (largest first)
      const classKeys = Object.keys(studentsByClass).sort(
        (a, b) => studentsByClass[b].length - studentsByClass[a].length
      );

      // First, distribute one student from each class across different benches
      // to create an initial spread
      let currentPosition = 0;

      for (let round = 0; round < 3; round++) {
        // Do multiple rounds of initial distribution
        for (const classKey of classKeys) {
          if (studentsByClass[classKey].length > 0) {
            const student = studentsByClass[classKey][0];
            const maxTries = allPositions.length;
            let tried = 0;

            while (tried < maxTries) {
              const pos = allPositions[currentPosition];
              if (
                seatingStructure[pos.group].benches[pos.bench][pos.seat] ===
                  null &&
                isValidPlacement(
                  pos.group,
                  pos.bench,
                  pos.seat,
                  student,
                  seatingStructure
                )
              ) {
                seatingStructure[pos.group].benches[pos.bench][pos.seat] =
                  student;
                studentsByClass[classKey].shift();
                break;
              }
              currentPosition = (currentPosition + 1) % allPositions.length;
              tried++;
            }
          }
        }
      }

      // Then fill remaining seats
      for (const classKey of classKeys) {
        const students = studentsByClass[classKey];
        while (students.length > 0) {
          const student = students[0];
          let placed = false;

          // Try all positions
          for (let i = 0; i < allPositions.length && !placed; i++) {
            const pos = allPositions[i];
            if (
              seatingStructure[pos.group].benches[pos.bench][pos.seat] ===
                null &&
              isValidPlacement(
                pos.group,
                pos.bench,
                pos.seat,
                student,
                seatingStructure
              )
            ) {
              seatingStructure[pos.group].benches[pos.bench][pos.seat] =
                student;
              students.shift();
              placed = true;
            }
          }

          if (!placed) {
            // If we couldn't place a student, try rearranging nearby students
            const success = tryRearrangeNearby(student, seatingStructure);
            if (!success) {
              return false;
            }
            students.shift();
          }
        }
      }

      return true;
    };

    // Helper function to try rearranging nearby students to make space
    const tryRearrangeNearby = (
      student: Student,
      structure: GroupStructure[]
    ): boolean => {
      for (let g = 0; g < structure.length; g++) {
        for (let b = 0; b < structure[g].benches.length; b++) {
          for (let s = 0; s < studentsPerBench; s++) {
            if (structure[g].benches[b][s] === null) {
              // Try swapping some nearby students to make this position valid
              const swapSuccess = trySwapToAccommodate(
                g,
                b,
                s,
                student,
                structure
              );
              if (swapSuccess) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };

    // Helper function to try swapping students to accommodate a new student
    const trySwapToAccommodate = (
      group: number,
      bench: number,
      seat: number,
      student: Student,
      structure: GroupStructure[]
    ): boolean => {
      // Store original configuration
      const originalConfig = JSON.parse(JSON.stringify(structure));

      // Try moving students in nearby benches
      for (
        let b = Math.max(0, bench - 2);
        b <= Math.min(structure[group].benches.length - 1, bench + 2);
        b++
      ) {
        if (b === bench) continue;

        const benchStudents = structure[group].benches[b].filter(
          (s): s is Student => s !== null
        );
        for (const existingStudent of benchStudents) {
          // Temporarily remove student
          structure[group].benches[b][
            structure[group].benches[b].indexOf(existingStudent)
          ] = null;

          // Try placing our new student
          if (isValidPlacement(group, bench, seat, student, structure)) {
            structure[group].benches[bench][seat] = student;

            // Try finding a new spot for the removed student
            for (const pos of allPositions) {
              if (
                structure[pos.group].benches[pos.bench][pos.seat] === null &&
                isValidPlacement(
                  pos.group,
                  pos.bench,
                  pos.seat,
                  existingStudent,
                  structure
                )
              ) {
                structure[pos.group].benches[pos.bench][pos.seat] =
                  existingStudent;
                return true;
              }
            }
          }

          // If we couldn't make it work, restore the original configuration
          Object.assign(structure, JSON.parse(JSON.stringify(originalConfig)));
        }
      }

      return false;
    };

    // Try to place all students with the new strategy
    const success = placeStudentsStrategically();

    if (!success) {
      setError(
        "Could not find a valid seating arrangement. Try reducing class sizes or adding more seats."
      );
      return;
    }

    setSeatingPlan(seatingStructure);
  };

  return (
    <div className="p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Input Section */}
        <div className="w-full lg:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Input Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold mb-4">Class Details</h3>
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    <div className="font-bold col-span-1">Class</div>
                    <div className="font-bold">Start</div>
                    <div className="font-bold">End</div>
                    <div className="font-bold">Total</div>
                    <div></div>
                  </div>

                  {classes.map((c, index) => (
                    <div key={index} className="grid grid-cols-5 gap-2 mb-2">
                      <Input
                        value={c.class}
                        onChange={(e) =>
                          updateClass(index, "class", e.target.value)
                        }
                        placeholder="Class"
                        className="col-span-1"
                      />
                      <Input
                        value={c.startNum}
                        onChange={(e) =>
                          updateClass(index, "startNum", e.target.value)
                        }
                        placeholder="Start"
                        type="number"
                      />
                      <Input
                        value={c.endNum}
                        onChange={(e) =>
                          updateClass(index, "endNum", e.target.value)
                        }
                        placeholder="End"
                        type="number"
                      />
                      <Input value={c.total} readOnly placeholder="Total" />

                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => deleteClass(index)}
                          className="hover:bg-grey-100 p-2 bg-white rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <Button onClick={addClass} className="mt-2">
                    Add Class
                  </Button>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-bold mb-4">
                    Group Configuration
                  </h3>
                  <div className="mb-4">
                    <label className="block mb-2">Students per Bench:</label>
                    <Input
                      type="number"
                      value={studentsPerBench}
                      onChange={(e) =>
                        setStudentsPerBench(parseInt(e.target.value))
                      }
                      min="1"
                    />
                  </div>

                  {groups.map((group, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2 mb-2">
                      <div className="font-bold flex items-center">
                        Row {group.name}
                      </div>
                      <Input
                        type="number"
                        value={group.benches}
                        onChange={(e) => updateGroup(index, e.target.value)}
                        placeholder="Benches"
                        min="1"
                      />
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => deleteGroup(index)}
                          className="hover:bg-grey-100 p-2 bg-white rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <Button onClick={addGroup} className="mt-2">
                    Add Row
                  </Button>
                </div>

                <Button onClick={generateSeatingPlan} className="w-full mt-4">
                  Generate Seating Plan
                </Button>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Output Section */}
        <div
          className={`w-full ${
            isFullScreen ? "fixed inset-0 z-50 bg-white p-4" : "lg:w-2/3"
          }`}
        >
          {seatingPlan.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Seating Arrangement</CardTitle>
                <div className="flex items-center justify-center gap-4">
                  <Button onClick={handleDownloadPDF} variant="outline">
                    Download PDF
                  </Button>
                  <button
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="hover:bg-grey-100 p-2 bg-white rounded-md transition-colors"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div id="seating-arrangement" className="flex flex-wrap gap-4">
                  {seatingPlan.map((group, groupIndex) => (
                    <div key={groupIndex} className="flex-1 min-w-[300px]">
                      <h4 className="text-md font-bold mb-2">
                        Row {group.name}
                      </h4>
                      <div className="flex flex-col gap-4">
                        {group.benches.map((bench, benchIndex) => (
                          <div
                            key={benchIndex}
                            className="border p-2 rounded bg-gray-50"
                          >
                            <div className="text-xs text-gray-500 mb-1">
                              Bench {benchIndex + 1}
                            </div>
                            <div className="flex gap-2">
                              {bench.map((student, seatIndex) => (
                                <div
                                  key={seatIndex}
                                  className="p-2 rounded text-center text-sm flex-1"
                                  style={{
                                    backgroundColor: student
                                      ? `hsl(${
                                          (parseInt(student.class) * 60) % 360
                                        }, 70%, 90%)`
                                      : "white",
                                  }}
                                >
                                  {student ? (
                                    <>
                                      <div className="font-bold">
                                        Class {student.class}
                                      </div>
                                      <div>No. {student.admitNo}</div>
                                    </>
                                  ) : (
                                    <div className="text-gray-400">Empty</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RandomSeatingPlanner;
